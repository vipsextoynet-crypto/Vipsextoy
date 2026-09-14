"""
auto_post_blog.py
====================
Tự động đăng bài Blog lên vipsextoy.net mỗi ngày, dựa trên topics_queue.csv
(tạo bằng generate_topic_calendar.py). Dùng chung phiên đăng nhập
(state.json) với auto_rewrite_products.py — không cần đăng nhập lại.

QUY TRÌNH
---------
1) Vào admin.php?f=baiviet, gõ tiêu đề vào ô "Thêm bài mới", chọn danh mục
   "Blog", bấm "Đồng ý" -> web tự tạo bài mới & chuyển sang trang chi tiết
   admin.php?f=baivietchitiet&id=XXX
2) Gọi Gemini sinh: tiêu đề chuẩn SEO, slug URL, meta title/description/
   keywords, mô tả ngắn, nội dung đầy đủ (HTML, giữ đúng style Tailwind-like
   class đang dùng cho các bài cũ để đồng bộ giao diện), + FAQ (dùng để
   vừa hiển thị trong bài vừa build JSON-LD FAQPage schema).
3) Điền toàn bộ vào form, gọi thẳng hàm JS gianhang_sua_tin_moi(id) để lưu
   (đúng hàm mà nút "Đồng ý" trên trang chi tiết gọi).
4) Đánh dấu dòng tương ứng trong topics_queue.csv là POSTED kèm id/url.

CÁCH DÙNG
---------
   python auto_post_blog.py --run              # đăng 1 bài tiếp theo (PENDING đầu tiên)
   python auto_post_blog.py --run --count 3     # đăng liền 3 bài (bắt kịp lịch)

Đặt lịch chạy 1 lần/ngày bằng Windows Task Scheduler để "python auto_post_blog.py --run"
chạy tự động mỗi sáng — mỗi lần chỉ đăng 1 bài đúng nghĩa "mỗi ngày 1 bài".

CẦN BẠN KIỂM TRA LẠI (vì tôi chỉ có ảnh chụp cho trang danh sách, không có
HTML thật của trang admin.php?f=baiviet):
   - SELECTOR_NEW_TITLE_INPUT / SELECTOR_NEW_CATEGORY_SELECT / SELECTOR_NEW_SUBMIT_BTN
     bên dưới — nếu bấm "Đồng ý" không ăn, F12 lấy đúng selector rồi sửa 3 dòng đó.
Các phần còn lại (trang chi tiết bài viết) đã lấy chính xác từ HTML thật bạn gửi.
"""

import argparse
import base64
import csv
import json
import random
import re
import time
import unicodedata
from datetime import datetime, timedelta
from pathlib import Path

import requests
from playwright.sync_api import sync_playwright

# ============ CẤU HÌNH ============

BASE_URL = "https://vipsextoy.net"
LOGIN_URL = BASE_URL + "/admin.php"
BLOG_LIST_URL = BASE_URL + "/admin.php?f=baiviet"
BLOG_DETAIL_URL = BASE_URL + "/admin.php?f=baivietchitiet&id={id}"

GEMINI_API_URL = "http://localhost:8000/v1/chat/completions"
GEMINI_MODEL = "gemini-3-flash"

# ---- Ảnh minh hoạ cho blog ----
ENABLE_AI_IMAGES = True                          # tắt nếu chưa muốn chèn ảnh

# IMAGE_SOURCE_MODE — 2 lựa chọn:
#   "api"            -> (MẶC ĐỊNH) tự sinh ảnh qua Google AI Studio thật
#                       (IMAGE_API_MODE="gemini_native" bên dưới). CẦN
#                       điền IMAGE_API_KEY (trả phí theo lượt) lấy tại
#                       https://aistudio.google.com/apikey
#   "local_library"  -> lấy ảnh có sẵn từ thư mục IMAGE_LIBRARY_DIR trên
#                       máy bạn (bạn tự tải ảnh về bỏ vào đó). Không cần
#                       API, không tốn phí, nhưng phải tự chuẩn bị ảnh.
IMAGE_SOURCE_MODE = "api"
IMAGE_LIBRARY_DIR = Path(__file__).parent / "ai_images"  # chỉ dùng khi IMAGE_SOURCE_MODE="local_library"
NUM_BLOG_IMAGES = 2                              # số ảnh chèn mỗi bài (không tính ảnh đại diện)

# ---- Cấu hình cho IMAGE_SOURCE_MODE = "api" ----
IMAGE_API_MODE = "gemini_native"      # "gemini_native" (Google AI Studio thật) / "local_gateway" / "openai_compatible"
IMAGE_MODEL = "gemini-3-pro-image-preview"  # model sinh ảnh thật của Google — kiểm tra lại tên nếu lỗi 404
IMAGE_API_BASE_URL = "https://generativelanguage.googleapis.com"
IMAGE_API_KEY = "AQ.Ab8RN6IinOoJSUGsblOG_EQ6oiQDMhkpsrmauKkzR5dMDVMnHw"                    # BẮT BUỘC điền — lấy tại https://aistudio.google.com/apikey

GEMINI_API_KEY = None

STATE_FILE = Path(__file__).parent / "state.json"          # dùng chung với script sản phẩm
TOPICS_FILE = Path(__file__).parent / "topics_queue.csv"    # tạo bằng generate_topic_calendar.py
LOG_FILE = Path(__file__).parent / "blog_post_log.csv"
DEBUG_DIR = Path(__file__).parent / "debug_blog"

HEADLESS_RUN = False
DELAY_SECONDS = (5, 12)

BLOG_CATEGORY_NAME = "Blog"  # phải khớp đúng chữ hiển thị trong cây danh mục bài viết

# Selector trên trang danh sách (admin.php?f=baiviet) — lấy chính xác từ HTML thật
SELECTOR_NEW_TITLE_INPUT = "#dm_name"
SELECTOR_NEW_CATEGORY_SELECT = "#danhmuc"       # value="1" = Blog, value="2" = Giới thiệu
SELECTOR_NEW_SUBMIT_BTN = "#button2"

# ============ PROMPT GỬI GEMINI ============

# Xoay vòng ngẫu nhiên mỗi lần gọi để bài không bị "thô"/công thức giống
# hệt nhau — cùng cơ chế đã dùng trong auto_rewrite_products.py.
BLOG_TONE_VARIANTS = [
    "gần gũi, như đang tâm sự trực tiếp với người đọc, xưng 'bạn' tự nhiên",
    "chuyên nghiệp, điềm đạm, như chuyên gia tư vấn sức khoẻ cá nhân",
    "dí dỏm nhẹ nhàng, câu ngắn, thỉnh thoảng chêm câu hỏi tu từ để giữ nhịp đọc",
    "thẳng thắn, thực tế, ưu tiên ví dụ và tình huống cụ thể hơn lý thuyết",
]

BLOG_OPENING_HOOK_VARIANTS = [
    "mở bài bằng 1 tình huống/băn khoăn rất đời thường mà độc giả hay gặp, "
    "rồi mới dẫn vào chủ đề (KHÔNG mở bài kiểu định nghĩa giáo khoa)",
    "mở bài bằng 1 câu hỏi trực tiếp đánh đúng nỗi băn khoăn của người đọc",
    "mở bài bằng 1 sự thật/con số bất ngờ liên quan chủ đề, rồi triển khai",
    "mở bài bằng cách nêu thẳng sai lầm phổ biến mà nhiều người mắc phải "
    "về chủ đề này, tạo tò mò muốn đọc tiếp",
]

BLOG_FOCUS_ANGLE_VARIANTS = [
    "xoáy sâu vào khía cạnh cảm xúc/tâm lý của người đọc",
    "xoáy sâu vào khía cạnh thực hành, hướng dẫn từng bước cụ thể",
    "xoáy sâu vào việc so sánh đúng/sai, hiểu nhầm phổ biến cần đính chính",
    "xoáy sâu vào trải nghiệm/câu chuyện tình huống thực tế (kể ngắn gọn, "
    "không cần nêu tên thật, dạng 'nhiều người từng gặp tình huống...')",
]

SYSTEM_PROMPT_BLOG = """Bạn là chuyên gia Content SEO & GEO (Generative Engine Optimization) cho
blog của một shop thương mại điện tử bán đồ chơi người lớn (sextoy) hợp
pháp tại Việt Nam. Viết bài blog đầy đủ, tối ưu cho CẢ Google truyền
thống LẪN AI trả lời (Google AI Overviews, ChatGPT, Gemini, Perplexity).

QUY TẮC NỘI DUNG:
- Giọng văn chuyên nghiệp, tinh tế, mang tính giáo dục sức khỏe/lối sống
  cho người trưởng thành. TUYỆT ĐỐI không viết nội dung khiêu dâm, tường
  thuật tình dục lộ liễu hay ngôn từ phản cảm.
- KHÔNG đưa ra chẩn đoán y khoa hay khẳng định chữa bệnh. Nếu có nhắc lợi
  ích sức khỏe, dùng ngôn từ thận trọng ("có thể hỗ trợ", "theo nhiều
  chia sẻ") và LUÔN kết bài bằng đoạn miễn trừ trách nhiệm y tế.
- Nội dung phải nguyên bản, có góc nhìn/thông tin cụ thể — KHÔNG viết
  chung chung sáo rỗng để tránh bị xem là nội dung nhân bản hàng loạt.
- BẮT BUỘC theo đúng "giọng văn", "kiểu mở bài" và "góc nhấn" được chỉ
  định riêng cho lần viết này ở cuối prompt — đây là cơ chế chống mọi bài
  đọc giống hệt nhau (không dùng công thức "X là..." mở đầu mọi bài).
- Tránh lối viết liệt kê khô khan kiểu giáo trình. Xen kẽ câu dài/ngắn,
  thỉnh thoảng dùng câu hỏi tu từ, ví dụ cụ thể, tình huống thực tế thay
  vì chỉ nêu định nghĩa/đặc điểm chung chung.
- Mỗi mục H2 nên có 1 câu "hook" riêng mở đầu mục đó (không phải câu nêu
  lại y hệt tiêu đề bằng từ khác), giúp mỗi đoạn đọc cuốn hơn thay vì rời
  rạc từng khối tách biệt.

BẮT BUỘC TRẢ VỀ ĐÚNG ĐỊNH DẠNG SAU (KHÔNG dùng JSON, KHÔNG dùng markdown,
KHÔNG giải thích gì thêm — chỉ xuất đúng các khối dưới đây theo đúng thứ
tự, mỗi khối bắt đầu bằng dòng marker riêng của nó):

<<<H1_TITLE>>>
(tiêu đề H1 hấp dẫn, chứa từ khóa chính, tối đa ~70 ký tự, 1 dòng)
<<<SEO_TITLE>>>
(thẻ title SEO, tối đa 60 ký tự, chứa từ khóa chính, 1 dòng)
<<<SLUG>>>
(url-khong-dau-khong-hoa-cach-nhau-bang-dau-gach-ngang, 1 dòng)
<<<META_DESCRIPTION>>>
(mô tả meta 140-160 ký tự, 1 dòng)
<<<KEYWORDS>>>
(5 từ khóa cách nhau bằng dấu phẩy, 1 dòng)
<<<SHORT_DESCRIPTION_HTML>>>
(1 đoạn <p> mô tả ngắn 1-2 câu)
<<<CONTENT_HTML>>>
(nội dung đầy đủ, xem ĐỊNH DẠNG bên dưới)
<<<FAQ>>>
Q1: câu hỏi 1
A1: câu trả lời 1 (viết liền 1 dòng, không xuống dòng giữa chừng)
Q2: câu hỏi 2
A2: câu trả lời 2 (viết liền 1 dòng)
Q3: câu hỏi 3
A3: câu trả lời 3 (viết liền 1 dòng)
<<<TAGS>>>
(4 tag ngắn cách nhau bằng dấu phẩy, 1 dòng)
<<<END>>>

QUAN TRỌNG: TUYỆT ĐỐI KHÔNG dùng chuỗi ký tự "<<<" hay ">>>"  ở bất kỳ đâu
khác ngoài các dòng marker này. Dùng dấu ngoặc kép " bình thường trong
HTML (không cần escape gì cả vì đây KHÔNG phải JSON).

ĐỊNH DẠNG content_html (BẮT BUỘC theo đúng để đồng bộ giao diện các bài
đã có trên site — copy nguyên các class, chỉ thay nội dung):
- Mở đầu 1 đoạn <p> giới thiệu chủ đề (không có class riêng).
- 4-6 mục <h2 class="text-2xl font-bold text-slate-100 mt-10 mb-4 flex items-center gap-2">
  Số thứ tự + Tiêu đề mục</h2> theo sau là <p class="mb-4"> nội dung, có
  thể xen <ul class="list-disc pl-6 mb-4 space-y-2"><li><strong>...</strong>...</li></ul>
  khi liệt kê.
- Ngay sau MỖI thẻ <h2>...</h2> (trừ mục FAQ), thêm 1 dòng comment HTML
  ẩn dạng <!--IMG_HINT: 3-6 từ khoá tiếng Anh mô tả hình ảnh minh hoạ phù
  hợp cho mục này--> để hệ thống dùng sinh/chọn ảnh đúng chủ đề mục đó.
  Comment này KHÔNG hiển thị với người đọc, chỉ dùng nội bộ.
- Cuối bài, BẮT BUỘC chèn đúng khối FAQ này (dùng lại đúng câu hỏi/trả
  lời trong trường "faq" ở trên, KHÔNG lặp lại nội dung faq ở nơi khác):
  <div class="mt-12 p-8 bg-slate-800/60 rounded-2xl border border-slate-700/50 faq-section">
  <div class="space-y-6">
  <div class="pb-4 border-b border-slate-700/40 last:border-0 last:pb-0">
  <h4 class="text-base font-bold text-slate-100 mb-2 flex gap-2"><span class="text-indigo-400 font-extrabold">Q1:</span> [câu hỏi 1]</h4>
  <p class="text-slate-300 text-sm pl-8 leading-relaxed">[trả lời 1]</p>
  </div>
  ... (lặp cho Q2, Q3) ...
  </div></div>
- Cuối cùng, BẮT BUỘC chèn đúng khối miễn trừ trách nhiệm y tế này:
  <div class="mt-12 p-6 bg-gradient-to-r from-purple-900/20 to-indigo-900/20 rounded-2xl border border-indigo-500/20 text-center">
  <h3 class="text-lg font-bold text-slate-100 mb-2">Tuyên bố miễn trừ trách nhiệm y tế (Disclaimer)</h3>
  <p class="text-xs text-slate-400 leading-relaxed max-w-2xl mx-auto">Nội dung trong bài viết này chỉ nhằm mục đích cung cấp thông tin, kiến thức giáo dục giới tính và phong cách sống lành mạnh cho người trưởng thành. Nó hoàn toàn không thay thế cho bất kỳ chẩn đoán, tư vấn điều trị hay lời khuyên y khoa trực tiếp nào từ các bác sĩ chuyên khoa hoặc chuyên gia y tế được cấp phép.</p>
  </div>

BỐ CỤC THEO LOẠI TUẦN (đọc kỹ trường week_type trong yêu cầu):
- week_type = SEO: nghiêng về so sánh sản phẩm, tiêu chí chọn mua, giá cả,
  gợi ý mua ở đâu uy tín — hướng người đọc có ý định mua.
- week_type = GUIDE: nghiêng về hướng dẫn sử dụng, vệ sinh, an toàn, giải
  đáp thắc mắc — hướng xây dựng lòng tin (E-E-A-T), ít tính bán hàng hơn.
"""

USER_PROMPT_TEMPLATE_BLOG = """Chủ đề bài viết: {topic}
Loại tuần (định hướng nội dung): {week_type}
Danh mục sản phẩm liên quan: {category}

Yêu cầu riêng cho lần viết này (BẮT BUỘC tuân theo để bài không giống
những bài trước):
- Giọng văn: {tone}
- Kiểu mở bài: {opening_hook}
- Góc nhấn xuyên suốt bài: {focus_angle}

Hãy viết bài blog hoàn chỉnh theo đúng định dạng marker đã quy định
trong system prompt. Chỉ trả về đúng các khối marker, không kèm gì khác.
"""


def parse_marker_response(raw: str) -> dict:
    """Parse định dạng <<<MARKER>>> nội dung <<<MARKER>>> nội dung... (không phải JSON,
    tránh hoàn toàn lỗi gãy JSON do dấu ngoặc kép trong thuộc tính HTML)."""
    parts = re.split(r"<<<(\w+)>>>", raw)
    fields = {}
    for i in range(1, len(parts) - 1, 2):
        marker = parts[i].strip()
        content = parts[i + 1].strip()
        fields[marker] = content

    faq_text = fields.get("FAQ", "")
    faq_list = []
    for q, a in re.findall(r"Q\d+:\s*(.+?)\s*\nA\d+:\s*(.+?)(?=\nQ\d+:|\Z)", faq_text, re.DOTALL):
        faq_list.append({"question": q.strip(), "answer": a.strip()})

    tags = [t.strip() for t in fields.get("TAGS", "").split(",") if t.strip()]

    return {
        "h1_title": fields.get("H1_TITLE", "").strip(),
        "seo_title": fields.get("SEO_TITLE", "").strip(),
        "slug": fields.get("SLUG", "").strip(),
        "meta_description": fields.get("META_DESCRIPTION", "").strip(),
        "keywords": fields.get("KEYWORDS", "").strip(),
        "short_description_html": fields.get("SHORT_DESCRIPTION_HTML", "").strip(),
        "content_html": fields.get("CONTENT_HTML", "").strip(),
        "faq": faq_list,
        "tags": tags,
    }


def slugify_fallback(text: str) -> str:
    """Tạo slug dự phòng nếu Gemini không trả về slug hợp lệ."""
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    text = re.sub(r"[^a-zA-Z0-9\s-]", "", text).strip().lower()
    text = re.sub(r"[\s_]+", "-", text)
    return re.sub(r"-+", "-", text).strip("-")


# ============ TỰ SINH CHỦ ĐỀ BẰNG GEMINI (thay cho topics_queue.csv cố định) ============
# Chuyển thể từ hàm generateSuggestedTopics() trong app AI Studio
# "vietnamese-sexual-wellness-seo-ai" — dùng cùng 1 định dạng gọi Gemini
# với call_gemini_blog() bên dưới, để không cần thêm cấu hình/API key mới.

# Giữ đúng danh mục từ generate_topic_calendar.py — chỉnh lại nếu cây danh
# mục thật trên site bạn khác đi.
AUTO_TOPIC_CATEGORIES = [
    "Sextoy cho Nam", "Sextoy cho Nữ", "Trứng Rung", "Máy Massage",
    "Sextoy Cao Cấp", "Sextoy Cho LGBT", "Tăng Cường Sinh Lý",
    "Gel Bôi Trơn", "Bao Cao Su", "Nước Hoa",
]

AUTO_TOPIC_SYSTEM_PROMPT = """Bạn là Giám đốc Nội dung của một tạp chí Sexual Wellness & Lifestyle cao cấp tại
Việt Nam, phụ trách blog cho 1 shop thương mại điện tử bán đồ chơi người
lớn (sextoy) hợp pháp.

Nhiệm vụ: gợi ý ĐÚNG 1 tiêu đề bài blog chuẩn SEO, thuộc danh mục và định
hướng nội dung được chỉ định bên dưới.

YÊU CẦU:
- Tiêu đề tạo cảm giác tò mò nhưng không rẻ tiền, không dùng từ ngữ thô
  tục/khiêu dâm — dùng cách diễn đạt tinh tế kiểu "Nghệ thuật yêu", "Bí
  quyết thăng hoa", "Wellness cho phái đẹp".
- Tập trung vào GIÁ TRỊ LỢI ÍCH: sức khỏe, tâm lý, gắn kết lứa đôi.
- KHÔNG trùng hoặc quá giống bất kỳ tiêu đề nào trong danh sách "đã dùng"
  được liệt kê bên dưới.
- Chỉ trả về ĐÚNG 1 dòng là tiêu đề, không kèm giải thích, không đánh số,
  không markdown, không dấu ngoặc kép bao quanh."""

AUTO_TOPIC_USER_PROMPT = """Danh mục: {category}
Định hướng nội dung tuần này: {week_type_desc}

Các tiêu đề ĐÃ DÙNG (không lặp lại, kể cả gần giống):
{used_list}

Hãy đưa ra 1 tiêu đề bài blog mới, chưa từng dùng, thuộc danh mục và
định hướng trên."""


def _week_type_for_date(d: "datetime.date") -> str:
    """Giữ đúng quy tắc xen kẽ tuần lẻ=SEO / tuần chẵn=GUIDE như
    generate_topic_calendar.py, tính theo tuần ISO của năm."""
    week_number = d.isocalendar()[1]
    return "SEO" if week_number % 2 == 1 else "GUIDE"


def generate_topic_via_gemini(used_topics: set, target_date: str) -> dict:
    """Gọi Gemini sinh 1 chủ đề MỚI (chưa dùng), trả về đúng format 1 dòng
    của topics_queue.csv (dict với các key: date, week_type, category,
    topic, status, post_id, url). Raise nếu gọi API lỗi — để do_run() xử
    lý như mọi lỗi khác (log FAIL, không làm gãy toàn bộ script)."""
    d = datetime.strptime(target_date, "%Y-%m-%d").date()
    week_type = _week_type_for_date(d)
    week_type_desc = (
        "SEO — thiên về từ khóa sản phẩm/ngành hàng, traffic tìm kiếm trực "
        "tiếp, người dùng có ý định mua"
        if week_type == "SEO" else
        "GUIDE — thiên về kiến thức/hướng dẫn cho khách, tăng độ tin cậy, "
        "dễ được AI trích dẫn"
    )
    category = random.choice(AUTO_TOPIC_CATEGORIES)
    used_list = "\n".join(f"- {t}" for t in list(used_topics)[-100:]) or "(chưa có)"

    headers = {"Content-Type": "application/json"}
    if GEMINI_API_KEY:
        headers["Authorization"] = f"Bearer {GEMINI_API_KEY}"
    payload = {
        "model": GEMINI_MODEL,
        "temperature": 1.0,
        "messages": [
            {"role": "system", "content": AUTO_TOPIC_SYSTEM_PROMPT},
            {
                "role": "user",
                "content": AUTO_TOPIC_USER_PROMPT.format(
                    category=category, week_type_desc=week_type_desc, used_list=used_list
                ),
            },
        ],
        "stream": False,
    }
    resp = requests.post(GEMINI_API_URL, json=payload, headers=headers, timeout=60)
    resp.raise_for_status()
    data = resp.json()
    topic = data["choices"][0]["message"]["content"].strip().strip('"').strip()

    return {
        "date": target_date,
        "week_type": week_type,
        "category": category,
        "topic": topic,
        "status": "PENDING",
        "post_id": "",
        "url": "",
    }


def ensure_pending_topics(rows: list, need_count: int) -> list:
    """Nếu số dòng PENDING hiện có < need_count, TỰ GỌI GEMINI sinh thêm
    chủ đề mới (ngày kế tiếp ngày cuối cùng đang có trong file) cho đến
    khi đủ. Trả về rows đã cập nhật (đã append dòng mới nếu có)."""
    pending_count = sum(1 for r in rows if r.get("status") == "PENDING")
    if pending_count >= need_count:
        return rows

    used_topics = {r["topic"] for r in rows}
    last_date = (
        max(datetime.strptime(r["date"], "%Y-%m-%d").date() for r in rows)
        if rows else datetime.now().date()
    )

    to_generate = need_count - pending_count
    print(f"   -> Hết chủ đề PENDING, tự sinh thêm {to_generate} chủ đề mới bằng Gemini...")
    for i in range(to_generate):
        next_date = (last_date + timedelta(days=i + 1)).isoformat()
        try:
            new_row = generate_topic_via_gemini(used_topics, next_date)
            rows.append(new_row)
            used_topics.add(new_row["topic"])
            print(f"      -> Đã sinh: [{new_row['category']}] {new_row['topic']}")
        except Exception as e:
            print(f"      -> Lỗi khi sinh chủ đề mới: {e} — dừng sinh thêm, dùng số đã có.")
            break
    save_topics(rows)
    return rows


def call_gemini_blog(topic: str, week_type: str, category: str) -> dict:
    headers = {"Content-Type": "application/json"}
    if GEMINI_API_KEY:
        headers["Authorization"] = f"Bearer {GEMINI_API_KEY}"

    payload = {
        "model": GEMINI_MODEL,
        "temperature": 0.9,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT_BLOG},
            {
                "role": "user",
                "content": USER_PROMPT_TEMPLATE_BLOG.format(
                    topic=topic,
                    week_type=week_type,
                    category=category,
                    tone=random.choice(BLOG_TONE_VARIANTS),
                    opening_hook=random.choice(BLOG_OPENING_HOOK_VARIANTS),
                    focus_angle=random.choice(BLOG_FOCUS_ANGLE_VARIANTS),
                ),
            },
        ],
        "stream": False,
    }
    resp = requests.post(GEMINI_API_URL, json=payload, headers=headers, timeout=240)
    resp.raise_for_status()
    data = resp.json()
    raw = data["choices"][0]["message"]["content"].strip()
    if raw.startswith("```"):
        raw = raw.strip("`").strip()

    parsed = parse_marker_response(raw)
    if not parsed.get("h1_title") or not parsed.get("content_html"):
        raise ValueError(
            f"Không parse được phản hồi Gemini (thiếu trường bắt buộc). "
            f"Đầu phản hồi: {raw[:300]!r}"
        )
    return parsed


def call_gemini_image_native(prompt: str) -> str:
    """Gọi THẲNG Gemini API gốc của Google (Google AI Studio) để sinh ảnh.
    Đây là schema thật của Google — KHÁC HẲN kiểu OpenAI:
      POST {base}/v1beta/models/{model}:generateContent
      Header: x-goog-api-key
      Response: candidates[0].content.parts[] — mỗi part có thể là text
      HOẶC ảnh (inlineData.data = base64). Cần lọc đúng part chứa ảnh vì
      model có thể trả về cả text lẫn ảnh trong cùng response."""
    url = f"{IMAGE_API_BASE_URL.rstrip('/')}/v1beta/models/{IMAGE_MODEL}:generateContent"
    headers = {"Content-Type": "application/json", "x-goog-api-key": IMAGE_API_KEY}
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"responseModalities": ["IMAGE"]},
    }
    resp = requests.post(url, json=payload, headers=headers, timeout=120)
    resp.raise_for_status()
    data = resp.json()

    try:
        parts = data["candidates"][0]["content"]["parts"]
    except (KeyError, IndexError):
        raise ValueError(f"Phản hồi Gemini không đúng schema kỳ vọng: {str(data)[:300]}")

    for part in parts:
        inline = part.get("inlineData") or part.get("inline_data")
        if inline and inline.get("data"):
            return inline["data"]  # đã sẵn là base64 PNG/JPEG

    raise ValueError(f"Model '{IMAGE_MODEL}' không trả về ảnh (không có inlineData): {str(data)[:300]}")


def call_gemini_image_openai_compatible(prompt: str) -> str:
    """Dự phòng: gọi qua 1 endpoint OpenAI-compatible (proxy/third-party)
    thay vì Gemini gốc — dùng khi IMAGE_API_MODE = 'openai_compatible'.
    Không có chuẩn cố định cho việc trả ảnh ở kiểu này nên thử LẦN LƯỢT
    vài cách phổ biến: base64 data URI trong content, hoặc URL ảnh."""
    headers = {"Content-Type": "application/json"}
    if IMAGE_API_KEY:
        headers["Authorization"] = f"Bearer {IMAGE_API_KEY}"

    payload = {
        "model": IMAGE_MODEL,
        "messages": [{"role": "user", "content": prompt}],
        "stream": False,
    }
    resp = requests.post(f"{IMAGE_API_BASE_URL.rstrip('/')}/v1/chat/completions", json=payload, headers=headers, timeout=120)
    resp.raise_for_status()
    raw_text = resp.text

    # Cách 1: base64 nhúng thẳng dạng data:image/...;base64,XXXX
    b64_match = re.search(r'data:image/\w+;base64,([A-Za-z0-9+/=]+)', raw_text)
    if b64_match:
        return b64_match.group(1)

    # Cách 2: URL ảnh (rồi tải về)
    url_match = re.search(r'https?://[^\s"\')<>]+\.(?:png|jpg|jpeg|webp)[^\s"\')<>]*', raw_text)
    if url_match:
        img_resp = requests.get(url_match.group(0), timeout=60)
        img_resp.raise_for_status()
        return base64.b64encode(img_resp.content).decode("ascii")

    raise ValueError(f"Không tìm thấy ảnh (base64 lẫn URL) trong phản hồi: {raw_text[:300]!r}")


def call_gemini_image_local_gateway(prompt: str) -> str:
    """Sinh ảnh qua chính gateway Gemini-FastAPI local (GEMINI_API_URL) —
    MIỄN PHÍ, đã xác minh gateway này thật sự đang chạy. Dự án này KHÔNG
    có endpoint kiểu OpenAI /v1/images/generations — chỉ có
    /v1/chat/completions. Model "gemini-3-pro" trên Gemini web vốn đã hỗ
    trợ tự sinh ảnh ngay trong chat khi được yêu cầu, ảnh trả về dưới
    dạng URL trỏ tới GET /images/{filename}?token=... nhúng trong nội
    dung phản hồi (markdown hoặc content block, tuỳ phiên bản).

    Cách làm AN TOÀN không phụ thuộc cấu trúc JSON chính xác: regex tìm
    URL dạng '.../images/...' ở BẤT KỲ ĐÂU trong toàn bộ response text,
    tải ảnh về từ URL đó (token đã có sẵn trong URL), trả về base64."""
    headers = {"Content-Type": "application/json"}
    if GEMINI_API_KEY:
        headers["Authorization"] = f"Bearer {GEMINI_API_KEY}"

    payload = {
        "model": IMAGE_MODEL,
        "messages": [{"role": "user", "content": f"Generate an image: {prompt}"}],
        "stream": False,
    }
    resp = requests.post(GEMINI_API_URL, json=payload, headers=headers, timeout=120)
    resp.raise_for_status()
    raw_text = resp.text

    match = re.search(r'https?://[^\s"\')<>]+/images/[^\s"\')<>]+', raw_text)
    if not match:
        raise ValueError(
            f"Không tìm thấy URL ảnh (dạng .../images/...) trong phản hồi. "
            f"Có thể model '{IMAGE_MODEL}' không tự sinh ảnh với prompt này, "
            f"hoặc tài khoản Gemini web chưa hỗ trợ tính năng ảnh. "
            f"raw[:300]={raw_text[:300]!r}"
        )
    image_url = match.group(0)

    img_resp = requests.get(image_url, timeout=60)
    img_resp.raise_for_status()
    return base64.b64encode(img_resp.content).decode("ascii")


def call_gemini_image(prompt: str) -> str:
    """Sinh ảnh — tự chọn cách gọi theo IMAGE_API_MODE đã cấu hình.
    Trả về base64 (KHÔNG có tiền tố data:...). Raise nếu lỗi."""
    if IMAGE_API_MODE == "local_gateway":
        return call_gemini_image_local_gateway(prompt)
    elif IMAGE_API_MODE == "gemini_native":
        return call_gemini_image_native(prompt)
    elif IMAGE_API_MODE == "openai_compatible":
        return call_gemini_image_openai_compatible(prompt)
    raise ValueError(
        f"IMAGE_API_MODE không hợp lệ: {IMAGE_API_MODE!r} "
        f"(chỉ nhận 'local_gateway', 'gemini_native' hoặc 'openai_compatible')"
    )


# ---- Retry khi gặp lỗi 429 (Too Many Requests / hết quota tạm thời) ----
IMAGE_GEN_MAX_RETRIES = 2        # số lần thử lại tối đa khi bị 429 (giảm xuống vì giờ
                                   # đã có ảnh dự phòng từ thư viện local, không cần chờ lâu)
IMAGE_GEN_BASE_DELAY = 15         # giây, chờ trước lần thử lại đầu tiên
IMAGE_GEN_MAX_DELAY = 120        # giây, trần thời gian chờ (tránh chờ quá lâu)
IMAGE_GEN_DELAY_BETWEEN_CALLS = 8  # giây, LUÔN nghỉ giữa 2 lần sinh ảnh liên tiếp
                                     # (kể cả khi thành công) để tránh dồn dập gây 429


def call_gemini_image_with_retry(prompt: str, label: str = "") -> str:
    """Bọc call_gemini_image(): khi gặp lỗi 429, CHỜ rồi TỰ THỬ LẠI thay vì
    bỏ qua ảnh ngay. Thời gian chờ tăng dần (backoff): 20s -> 40s -> 80s...
    (tôn trọng header Retry-After nếu server có trả về). Các lỗi KHÁC 429
    (vd 500, lỗi mạng, lỗi parse ảnh) KHÔNG retry — raise ngay như cũ, vì
    retry không giúp ích gì cho các lỗi đó."""
    last_err = None
    for attempt in range(1, IMAGE_GEN_MAX_RETRIES + 1):
        try:
            b64 = call_gemini_image(prompt)
            if attempt > 1:
                print(f"      -> Thành công sau {attempt} lần thử{f' ({label})' if label else ''}.")
            return b64
        except requests.HTTPError as e:
            status = e.response.status_code if e.response is not None else None
            if status != 429:
                raise  # lỗi khác 429 -> không retry, để logic gọi bên ngoài xử lý như cũ

            last_err = e
            retry_after = None
            if e.response is not None:
                retry_after = e.response.headers.get("Retry-After")
            if retry_after:
                try:
                    delay = float(retry_after)
                except ValueError:
                    delay = IMAGE_GEN_BASE_DELAY * (2 ** (attempt - 1))
            else:
                delay = IMAGE_GEN_BASE_DELAY * (2 ** (attempt - 1))
            delay = min(delay, IMAGE_GEN_MAX_DELAY)

            if attempt < IMAGE_GEN_MAX_RETRIES:
                print(f"      -> 429 (quá giới hạn request){f' cho {label}' if label else ''}, "
                      f"chờ {delay:.0f}s rồi thử lại (lần {attempt}/{IMAGE_GEN_MAX_RETRIES})...")
                time.sleep(delay)
            else:
                print(f"      -> Vẫn 429 sau {IMAGE_GEN_MAX_RETRIES} lần thử"
                      f"{f' cho {label}' if label else ''}, bỏ qua ảnh này.")
    raise last_err


def extract_h2_sections(html: str) -> list:
    """Tách content_html thành từng mục H2, lấy: tiêu đề H2, từ khoá ảnh
    (nếu Gemini có chèn <!--IMG_HINT: ...-->  ngay sau H2 đó), và vị trí
    (offset) NGAY SAU đoạn <p> đầu tiên của mục đó — đây là chỗ chèn ảnh
    hợp lý (sau khi đã có 1 đoạn giới thiệu mục, không chèn ảnh chình
    ình ngay dưới tiêu đề). Bỏ qua mục FAQ (KHÔNG có <h2> theo cấu trúc
    quy định, khối FAQ dùng <h4> riêng nên tự động không bị lẫn vào)."""
    sections = []
    h2_matches = list(re.finditer(r"<h2[^>]*>(.*?)</h2>", html, re.DOTALL))
    for idx, m in enumerate(h2_matches):
        heading_text = re.sub(r"<[^>]+>", "", m.group(1)).strip()
        after_h2 = m.end()
        next_start = h2_matches[idx + 1].start() if idx + 1 < len(h2_matches) else len(html)
        chunk = html[after_h2:next_start]

        img_hint_match = re.search(r"<!--\s*IMG_HINT:\s*(.+?)\s*-->", chunk)
        img_hint = img_hint_match.group(1).strip() if img_hint_match else heading_text

        first_p_end = re.search(r"</p>", chunk)
        insert_offset_in_chunk = first_p_end.end() if first_p_end else 0
        insert_pos = after_h2 + insert_offset_in_chunk

        sections.append({
            "heading": heading_text,
            "img_hint": img_hint,
            "insert_pos": insert_pos,
        })
    return sections


def build_image_prompts_for_sections(sections: list) -> list:
    """Dựng prompt sinh ảnh AN TOÀN, MỖI ẢNH GẮN VỚI 1 MỤC H2 CỤ THỂ (dùng
    img_hint lấy từ chính nội dung bài Gemini vừa viết) thay vì prompt
    chung chung theo tiêu đề tổng — nhờ vậy ảnh liên quan trực tiếp tới
    đoạn văn nó nằm cạnh."""
    safety_suffix = (
        ", phong cách minh hoạ trừu tượng/biên tập tối giản, tông màu pastel "
        "hoặc tối sang trọng, ánh sáng dịu, KHÔNG khoả thân, KHÔNG chi tiết "
        "cơ thể người, KHÔNG hình ảnh sản phẩm cụ thể, phù hợp bài blog sức "
        "khoẻ & lối sống người trưởng thành, an toàn, tinh tế, chuyên nghiệp"
    )
    prompts = []
    for s in sections:
        prompts.append(
            f"Ảnh minh hoạ khái niệm cho mục '{s['heading']}', ý chính: "
            f"{s['img_hint']}{safety_suffix}"
        )
    return prompts


def build_cover_image_prompt(h1_title: str, topic: str) -> str:
    """Prompt riêng cho ẢNH ĐẠI DIỆN (cover, tỉ lệ ngang) — khác với ảnh
    chèn trong bài, cần bố cục rộng/thoáng để làm thumbnail đẹp."""
    return (
        f"Ảnh bìa (cover) tỉ lệ ngang cho bài blog '{h1_title}', chủ đề {topic}, "
        f"phong cách minh hoạ trừu tượng/biên tập tối giản, bố cục rộng thoáng "
        f"có khoảng trống, tông màu pastel hoặc tối sang trọng, ánh sáng dịu, "
        f"KHÔNG khoả thân, KHÔNG chi tiết cơ thể người, KHÔNG hình ảnh sản phẩm "
        f"cụ thể, phù hợp làm ảnh đại diện bài blog sức khoẻ & lối sống người "
        f"trưởng thành, an toàn, tinh tế, chuyên nghiệp, chất lượng cao"
    )


def upload_featured_image_from_file(page, file_path: Path) -> None:
    """Giống upload_featured_image, nhưng dùng THẲNG 1 file ảnh có sẵn
    trên đĩa (từ IMAGE_LIBRARY_DIR) — không cần ghi file tạm vì đã là
    file thật rồi."""
    page.set_input_files("#file", str(file_path))
    page.wait_for_timeout(2500)  # chờ AJAX upload.php xử lý xong


def upload_featured_image(page, post_id: str, b64_png: str) -> None:
    """Upload ẢNH ĐẠI DIỆN thật qua <input type="file" id="file">. Đây là
    input file thật (khác hẳn nội dung TinyMCE) nên KHÔNG thể set bằng
    URL/base64 trực tiếp trong content — phải ghi ra file tạm trên đĩa rồi
    dùng page.set_input_files() để trình duyệt "chọn file" giúp, sau đó
    onchange có sẵn (submit_form3(...)) sẽ tự AJAX upload lên
    modules/gianhang_tin/upload.php?id={post_id}."""
    import base64
    import tempfile

    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as f:
            f.write(base64.b64decode(b64_png))
            tmp_path = f.name

        page.set_input_files("#file", tmp_path)
        page.wait_for_timeout(2500)  # chờ AJAX upload.php xử lý xong
    finally:
        if tmp_path:
            try:
                Path(tmp_path).unlink(missing_ok=True)
            except Exception:
                pass


def enforce_seo_limits(data: dict) -> dict:
    """Ràng buộc CỨNG độ dài các trường SEO — không phụ thuộc hoàn toàn
    vào việc Gemini có tuân thủ đúng giới hạn trong prompt hay không.
    Google thường cắt title >60 ký tự và meta description >160 ký tự khi
    hiển thị trên SERP, nên cắt bớt tại đây để tránh hiển thị dở dang."""
    title = (data.get("seo_title") or data["h1_title"]).strip()
    if len(title) > 60:
        title = title[:57].rstrip() + "..."
    data["seo_title"] = title

    desc = (data.get("meta_description") or "").strip()
    if len(desc) > 160:
        desc = desc[:157].rstrip() + "..."
    data["meta_description"] = desc

    return data



def pick_local_images(num: int) -> list:
    """Lấy ngẫu nhiên `num` ảnh từ IMAGE_LIBRARY_DIR — dùng cho ẢNH ĐẠI
    DIỆN (cover) và các chỗ không cần match theo nội dung mục cụ thể.
    Chèn ảnh minh hoạ TRONG bài dùng pick_local_images_for_sections()
    bên dưới (thông minh hơn, match theo từ khoá từng mục)."""
    if not IMAGE_LIBRARY_DIR.exists():
        print(f"   -> Cảnh báo: thư mục ảnh '{IMAGE_LIBRARY_DIR}' chưa tồn tại, bỏ qua ảnh.")
        return []
    exts = {".jpg", ".jpeg", ".png", ".webp"}
    files = [f for f in IMAGE_LIBRARY_DIR.iterdir() if f.suffix.lower() in exts]
    if not files:
        print(f"   -> Cảnh báo: thư mục ảnh '{IMAGE_LIBRARY_DIR}' không có ảnh nào, bỏ qua ảnh.")
        return []
    random.shuffle(files)
    return files[:num]


def _slug_keywords(text: str) -> set:
    """Tách text thành tập từ khoá ascii-hoá để so khớp mờ với tên file
    ảnh (vd 'chăm sóc bản thân' -> {'cham','soc','ban','than'})."""
    ascii_text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    return set(re.findall(r"[a-z0-9]+", ascii_text.lower()))


def pick_local_images_for_sections(sections: list) -> list:
    """Với MỖI mục H2 (đã có img_hint riêng), tìm ảnh trong thư viện có
    TÊN FILE khớp từ khoá nhiều nhất với img_hint của mục đó (so khớp
    theo từ, không phân biệt hoa/thường/dấu) — thay vì random thuần.
    Ảnh đã được chọn cho 1 mục sẽ không dùng lại cho mục khác trong cùng
    bài (tránh lặp ảnh). Nếu không có ảnh nào khớp từ khoá, dùng ảnh
    random còn lại (vẫn tốt hơn để trống). Trả về list[Path | None] cùng
    độ dài với `sections`."""
    if not IMAGE_LIBRARY_DIR.exists():
        print(f"   -> Cảnh báo: thư mục ảnh '{IMAGE_LIBRARY_DIR}' chưa tồn tại, bỏ qua ảnh.")
        return [None] * len(sections)
    exts = {".jpg", ".jpeg", ".png", ".webp"}
    files = [f for f in IMAGE_LIBRARY_DIR.iterdir() if f.suffix.lower() in exts]
    if not files:
        print(f"   -> Cảnh báo: thư mục ảnh '{IMAGE_LIBRARY_DIR}' không có ảnh nào, bỏ qua ảnh.")
        return [None] * len(sections)

    remaining = files[:]
    random.shuffle(remaining)  # để trường hợp hoà điểm cũng ngẫu nhiên, không luôn chọn file đầu tiên
    chosen = []
    for s in sections:
        hint_kw = _slug_keywords(s["img_hint"])
        best, best_score = None, 0
        for f in remaining:
            file_kw = _slug_keywords(f.stem)
            score = len(hint_kw & file_kw)
            if score > best_score:
                best, best_score = f, score
        if best is not None and best_score > 0:
            chosen.append(best)
            remaining.remove(best)
        elif remaining:
            # không có ảnh nào khớp từ khoá -> tạm lấy 1 ảnh random còn lại
            # thay vì bỏ trống hẳn mục này
            chosen.append(remaining.pop(0))
        else:
            chosen.append(None)
    return chosen


def read_image_as_base64(path: Path) -> str:
    return base64.b64encode(path.read_bytes()).decode("ascii")


def generate_blog_images_for_sections(sections: list, num: int) -> list:
    """Sinh/chọn ảnh RIÊNG CHO TỪNG MỤC H2 (dựa trên img_hint của mục đó),
    tối đa `num` mục đầu tiên (mục có img_hint = chính tiêu đề mục nếu
    Gemini không chèn IMG_HINT). Trả về list[(section, alt_text, base64)]
    — giữ nguyên `section` để biết chèn vào đâu. Theo IMAGE_SOURCE_MODE:
    - "local_library": chọn ảnh có sẵn khớp từ khoá img_hint (ỔN ĐỊNH)
    - "api": gọi API sinh ảnh riêng theo img_hint từng mục
    Ảnh nào lỗi thì bỏ qua (không làm gãy cả bài)."""
    picked_sections = sections[:num]
    results = []

    if IMAGE_SOURCE_MODE == "local_library":
        local_paths = pick_local_images_for_sections(picked_sections)
        for s, path in zip(picked_sections, local_paths):
            if path is None:
                continue
            try:
                b64 = read_image_as_base64(path)
                alt = f"{s['heading']} - {s['img_hint']}"[:120]
                results.append((s, alt, b64))
            except Exception as e:
                print(f"   -> Cảnh báo: đọc ảnh local '{path.name}' thất bại ({e}), bỏ qua ảnh này.")
        return results

    # IMAGE_SOURCE_MODE == "api"
    prompts = build_image_prompts_for_sections(picked_sections)
    failed_sections = []
    for i, (s, prompt) in enumerate(zip(picked_sections, prompts)):
        try:
            if i > 0:
                time.sleep(IMAGE_GEN_DELAY_BETWEEN_CALLS)  # nghỉ giữa các lần gọi để tránh 429
            b64 = call_gemini_image_with_retry(prompt, label=f"mục '{s['heading']}'")
            alt = f"{s['heading']} - {s['img_hint']}"[:120]
            results.append((s, alt, b64))
        except Exception as e:
            print(f"   -> Cảnh báo: sinh ảnh minh hoạ cho mục '{s['heading']}' thất bại sau khi đã thử lại ({e}).")
            failed_sections.append(s)

    # DỰ PHÒNG: mục nào API sinh ảnh thất bại (hết quota/429 kéo dài) thì
    # lấy tạm ảnh có sẵn trong thư viện local (khớp từ khoá nếu có) thay
    # vì bỏ trống hẳn — đảm bảo bài luôn có ảnh minh hoạ.
    if failed_sections:
        print(f"   -> Dùng ảnh dự phòng từ thư viện local cho {len(failed_sections)} mục bị lỗi API...")
        fallback_paths = pick_local_images_for_sections(failed_sections)
        for s, path in zip(failed_sections, fallback_paths):
            if path is None:
                print(f"      -> Không có ảnh local nào để dự phòng cho mục '{s['heading']}', mục này sẽ không có ảnh.")
                continue
            try:
                b64 = read_image_as_base64(path)
                alt = f"{s['heading']} - {s['img_hint']}"[:120]
                results.append((s, alt, b64))
                print(f"      -> Đã dùng ảnh dự phòng '{path.name}' cho mục '{s['heading']}'.")
            except Exception as e:
                print(f"      -> Cảnh báo: đọc ảnh dự phòng '{path.name}' thất bại ({e}), mục '{s['heading']}' sẽ không có ảnh.")

    return results


def strip_img_hint_comments(html: str) -> str:
    """Xoá các comment <!--IMG_HINT: ...--> khỏi HTML cuối cùng — chúng chỉ
    dùng nội bộ để chọn ảnh, không nên xuất hiện trong bài đã đăng."""
    return re.sub(r"<!--\s*IMG_HINT:.*?-->", "", html, flags=re.DOTALL)


def insert_images_into_content(html: str, images: list) -> str:
    """Chèn ảnh NGAY SAU đoạn <p> đầu tiên của ĐÚNG mục H2 mà ảnh đó được
    sinh/chọn cho (dùng section['insert_pos'] đã tính từ extract_h2_sections),
    thay vì chia đều mù quáng theo số lượng H2. Sau đó dọn sạch mọi
    comment IMG_HINT (kể cả ở các mục không được chèn ảnh)."""
    if not images:
        return strip_img_hint_comments(html)

    # chèn từ cuối lên đầu để không làm lệch offset các vị trí đã tính
    for section, alt, b64 in sorted(images, key=lambda x: -x[0]["insert_pos"]):
        pos = section["insert_pos"]
        img_tag = f'\n<p><img src="data:image/png;base64,{b64}" alt="{alt}" style="border-radius:12px;max-width:100%;"/></p>\n'
        html = html[:pos] + img_tag + html[pos:]
    return strip_img_hint_comments(html)



def build_faq_schema(faq_list: list) -> str:
    """Dựng JSON-LD FAQPage schema từ danh sách FAQ."""
    schema = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
            {
                "@type": "Question",
                "name": item["question"],
                "acceptedAnswer": {"@type": "Answer", "text": item["answer"]},
            }
            for item in faq_list
        ],
    }
    return f'<script type="application/ld+json">\n{json.dumps(schema, ensure_ascii=False, indent=2)}\n</script>'


# ============ THAO TÁC TRÌNH DUYỆT ============

def get_latest_post_id(page) -> str | None:
    """Đọc ID ở dòng ĐẦU TIÊN của bảng danh sách bài viết (cột #ID) — dùng
    làm MỐC 'ID cao nhất hiện có trước khi tạo bài mới', để sau này xác
    minh bài vừa tạo có thật sự MỚI hay không (tránh đè lên bài cũ)."""
    page.goto(BLOG_LIST_URL, wait_until="networkidle", timeout=60000)
    try:
        cell = page.locator("#suatin tr.td_lap td:nth-child(3)").first
        val = cell.inner_text(timeout=10000).strip()
        return val if val.isdigit() else None
    except Exception:
        return None

def _try_create_new_post_once(page, title: str, used_post_ids: set) -> str:
    """1 lần thử tạo bài mới — có thể raise nếu thất bại (được
    create_new_post() bọc retry bên ngoài xử lý)."""
    baseline_id = get_latest_post_id(page)  # đọc TRƯỚC khi tạo, làm mốc so sánh

    page.wait_for_selector(SELECTOR_NEW_TITLE_INPUT, state="visible", timeout=30000)
    page.fill(SELECTOR_NEW_TITLE_INPUT, title)
    page.select_option(SELECTOR_NEW_CATEGORY_SELECT, "1")  # "1" = danh mục Blog

    resp_text = ""
    try:
        with page.expect_response(lambda r: "them_xml.php" in r.url, timeout=20000) as resp_info:
            page.click(SELECTOR_NEW_SUBMIT_BTN)
        resp_text = resp_info.value.text()
    except Exception:
        pass  # vẫn thử fallback bên dưới nếu không bắt được response

    page.wait_for_timeout(1000)

    new_id = None
    m = re.search(r"id[=:](\d+)", resp_text)
    if m:
        new_id = m.group(1)

    if not new_id:
        # Fallback: tải lại trang danh sách, đọc ID ở dòng đầu tiên (bài mới nhất, #ID là ô thứ 3)
        page.goto(BLOG_LIST_URL, wait_until="networkidle", timeout=60000)
        first_id_cell = page.locator("#suatin tr.td_lap td:nth-child(3)").first
        try:
            new_id = first_id_cell.inner_text(timeout=10000).strip()
        except Exception:
            new_id = None

    if not new_id or not new_id.isdigit():
        DEBUG_DIR.mkdir(exist_ok=True)
        page.screenshot(path=str(DEBUG_DIR / "create_post_failed.png"), full_page=True)
        raise RuntimeError(f"Không xác định được ID bài viết mới. resp_text[:200]={resp_text[:200]!r}")

    # ---- CHẶN ĐÈ BÀI CŨ: xác minh new_id THỰC SỰ là bài mới ----
    # Chỉ cần 1 điều kiện: new_id PHẢI lớn hơn baseline_id đọc NGAY TRƯỚC
    # KHI submit. Đây là bằng chứng đủ mạnh: nếu new_id > baseline_id thì
    # chắc chắn đây là 1 dòng MỚI TOANH vừa xuất hiện sau baseline -> tuyệt
    # đối không thể là bài cũ đang tồn tại (bài cũ, nếu còn thật, đã phải
    # nằm trong khoảng <= baseline rồi vì baseline = ID cao nhất tại thời
    # điểm đó).
    if baseline_id and baseline_id.isdigit() and int(new_id) <= int(baseline_id):
        DEBUG_DIR.mkdir(exist_ok=True)
        page.screenshot(path=str(DEBUG_DIR / f"create_post_id_not_new_{new_id}.png"), full_page=True)
        raise RuntimeError(
            f"NGHI NGỜ ĐÈ BÀI CŨ: ID lấy được ({new_id}) không lớn hơn ID cao nhất "
            f"trước khi tạo ({baseline_id}) -> có vẻ bài mới KHÔNG được tạo thành "
            f"công (form submit thất bại âm thầm). Dừng lại để KHÔNG ghi đè nội "
            f"dung bài cũ. Hãy kiểm tra ảnh debug và selector #dm_name/#danhmuc/#button2."
        )

    # CHỈ CẢNH BÁO (không dừng lại) nếu ID này từng xuất hiện trong log cũ
    # -- CMS có thể TÁI SỬ DỤNG ID sau khi bài cũ bị xoá tay trên admin,
    # nên việc trùng số với log cũ KHÔNG đồng nghĩa đang đè bài thật đang
    # tồn tại (check phía trên đã đảm bảo điều đó rồi). Dừng hẳn ở đây
    # từng khiến mỗi lần retry lại tạo thêm 1 bài rác trùng lặp trên site
    # mà không có cách nào dọn được qua chính script.
    if new_id in used_post_ids:
        print(f"   -> Lưu ý: ID {new_id} từng xuất hiện trong log cũ (topics_queue.csv/"
              f"blog_post_log.csv) — có thể do CMS tái sử dụng ID sau khi bài cũ đã bị "
              f"xoá tay. Đã xác minh {new_id} > {baseline_id} (ID cao nhất TRƯỚC khi tạo) "
              f"nên đây chắc chắn là bài MỚI, không phải đè bài cũ. Tiếp tục bình thường.")

    return new_id


def create_new_post(page, title: str, used_post_ids: set, max_attempts: int = 3) -> str:
    """Tạo bài mới, TỰ ĐỘNG THỬ LẠI tối đa `max_attempts` lần nếu 1 lần
    thử thất bại (form submit đôi khi âm thầm không tạo được bài, thấy
    lặp lại nhiều lần trong thực tế). Mỗi lần thử đều bắt đầu từ trang
    danh sách sạch (get_latest_post_id() bên trong tự goto lại), nên
    không bị dính trạng thái lỗi của lần trước."""
    last_error = None
    for attempt in range(1, max_attempts + 1):
        try:
            return _try_create_new_post_once(page, title, used_post_ids)
        except Exception as e:
            last_error = e
            print(f"   -> Cảnh báo: tạo bài mới lần {attempt}/{max_attempts} thất bại ({e}).")
            if attempt < max_attempts:
                page.wait_for_timeout(2000)
    raise RuntimeError(f"Tạo bài mới thất bại sau {max_attempts} lần thử. Lỗi cuối: {last_error}")


def wait_tinymce_ready(page, timeout_ms=20000) -> bool:
    try:
        page.wait_for_function(
            "() => window.tinymce && tinymce.editors && tinymce.editors.length >= 2",
            timeout=timeout_ms,
        )
        return True
    except Exception:
        return False


def set_editor_by_name(page, field_name: str, html: str) -> None:
    """Set nội dung cho đúng textarea TinyMCE theo attribute name (des/detail/mdetail)."""
    page.evaluate(
        """([name, html]) => {
            const ed = tinymce.editors.find(e => e.targetElm && e.targetElm.name === name);
            if (ed) { ed.setContent(html); ed.save(); }
        }""",
        [field_name, html],
    )


def set_editor_content_with_upload(page, field_name: str, html: str) -> None:
    """Giống set_editor_by_name, nhưng sau khi set nội dung sẽ gọi
    ed.uploadImages() — đây chính là cơ chế TinyMCE dùng để tự động upload
    mọi ảnh <img src="data:..."> lên server thật qua images_upload_handler
    đã cấu hình sẵn cho editor này (giống hệt khi người dùng dán ảnh thủ
    công), rồi thay src bằng URL thật. Nếu editor này KHÔNG có cấu hình
    images_upload_handler, ảnh sẽ vẫn hiển thị đúng (giữ dạng base64 nhúng
    thẳng) nhưng không được tối ưu — không gây lỗi, chỉ nặng nội dung hơn."""
    page.evaluate(
        """async ([name, html]) => {
            const ed = tinymce.editors.find(e => e.targetElm && e.targetElm.name === name);
            if (!ed) return;
            ed.setContent(html);
            ed.save();
            try {
                await ed.uploadImages();
                ed.save();
            } catch (e) {
                console.warn('uploadImages() lỗi hoặc không được cấu hình:', e);
            }
        }""",
        [field_name, html],
    )


def fill_and_save_post(page, post_id: str, data: dict) -> None:
    if not wait_tinymce_ready(page):
        raise RuntimeError("TinyMCE không sẵn sàng trên trang chi tiết bài viết.")

    # Tiêu đề chính (H1)
    page.fill("#tieudetin", data["h1_title"])

    # ---- Ảnh đại diện (upload file thật, KHÔNG dính gì tới nội dung/form
    # bên trái nên làm lúc nào cũng an toàn) ----
    if ENABLE_AI_IMAGES:
        if IMAGE_SOURCE_MODE == "local_library":
            try:
                cover_images = pick_local_images(1)
                if cover_images:
                    upload_featured_image_from_file(page, cover_images[0])
                else:
                    print("   -> Cảnh báo: không có ảnh trong thư viện local cho ảnh đại diện, bỏ qua.")
            except Exception as e:
                print(f"   -> Cảnh báo: upload ảnh đại diện thất bại ({e}), bỏ qua ảnh đại diện.")
        else:
            try:
                cover_prompt = build_cover_image_prompt(data["h1_title"], data.get("topic", data["h1_title"]))
                cover_b64 = call_gemini_image_with_retry(cover_prompt, label="ảnh đại diện")
                upload_featured_image(page, post_id, cover_b64)
            except Exception as e:
                print(f"   -> Cảnh báo: sinh ảnh đại diện qua API thất bại sau khi đã thử lại ({e}).")
                # DỰ PHÒNG: hết quota API -> dùng tạm 1 ảnh có sẵn trong thư viện local làm ảnh đại diện
                try:
                    cover_images = pick_local_images(1)
                    if cover_images:
                        upload_featured_image_from_file(page, cover_images[0])
                        print(f"   -> Đã dùng ảnh dự phòng '{cover_images[0].name}' làm ảnh đại diện.")
                    else:
                        print("   -> Không có ảnh local nào để dự phòng, ảnh đại diện sẽ bị bỏ trống.")
                except Exception as e2:
                    print(f"   -> Cảnh báo: dùng ảnh dự phòng cho ảnh đại diện cũng thất bại ({e2}), bỏ qua ảnh đại diện.")

    # ---- Sinh + chèn ảnh minh hoạ AI vào nội dung (nếu bật) ----
    # MỚI: ảnh được chọn/sinh RIÊNG cho từng mục H2 (dựa trên nội dung
    # thật của mục đó, qua <!--IMG_HINT: ...--> hoặc chính tiêu đề H2),
    # và chèn ĐÚNG vào mục đó — không còn chèn mù theo vị trí chia đều.
    content_html = data["content_html"]
    if ENABLE_AI_IMAGES:
        sections = extract_h2_sections(content_html)
        if sections:
            if IMAGE_SOURCE_MODE == "api":
                time.sleep(IMAGE_GEN_DELAY_BETWEEN_CALLS)  # nghỉ sau ảnh đại diện trước khi sinh tiếp
            images = generate_blog_images_for_sections(sections, NUM_BLOG_IMAGES)
            content_html = insert_images_into_content(content_html, images)
        else:
            print("   -> Cảnh báo: không tìm thấy mục H2 nào để gắn ảnh, bỏ qua chèn ảnh minh hoạ.")
            content_html = strip_img_hint_comments(content_html)

    # Mô tả ngắn + Nội dung PC (2 editor TinyMCE riêng biệt theo name)
    set_editor_by_name(page, "des", data.get("short_description_html", ""))
    set_editor_content_with_upload(page, "detail", content_html)
    page.wait_for_timeout(1500)  # chờ thêm cho việc upload ảnh (network) kịp hoàn tất
    # "mdetail" (mobile) để trống -> web tự dùng lại nội dung PC

    # ---- Ràng buộc cứng độ dài SEO trước khi điền ----
    data = enforce_seo_limits(data)

    # Mở khối cấu hình SEO rồi điền (các input này luôn tồn tại trong DOM dù ẩn)
    page.evaluate("document.getElementById('div_seo').style.display='block'")
    page.fill("#title", data["seo_title"])
    slug = data.get("slug") or slugify_fallback(data["h1_title"])
    page.fill("#seourl", slug)
    page.fill("#keywords", data.get("keywords", ""))
    page.fill("#description", data["meta_description"])

    faq_list = data.get("faq", [])
    if faq_list:
        schema_html = build_faq_schema(faq_list)
        page.evaluate(
            "(html) => document.getElementById('header').value = html",
            schema_html,
        )

    # Ngày cập nhật = hiện tại
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M")
    page.fill("#date_modi", now_str)

    # Đảm bảo danh mục "Blog" đang được chọn (thường đã mặc định sẵn)
    danhmuc_val = page.eval_on_selector("#danhmucselected", "el => el.value")
    if not danhmuc_val or "1" not in danhmuc_val.split(","):
        try:
            page.click("#danhmuc_1")
        except Exception:
            pass

    # ---- LƯU NỘI DUNG CHÍNH TRƯỚC ----
    # (Web yêu cầu đúng thứ tự: nhập nội dung -> lưu -> rồi mới thêm hashtag.
    # Nếu thêm hashtag TRƯỚC khi lưu, nút thêm tag có thể submit/reload form
    # gốc và làm mất toàn bộ nội dung/tiêu đề/SEO chưa kịp lưu xuống DB.)
    page.evaluate(f"gianhang_sua_tin_moi({post_id})")
    page.wait_for_timeout(2500)

    # ---- SAU KHI ĐÃ LƯU, MỚI THÊM HASHTAG ----
    for tag in data.get("tags", [])[:4]:
        try:
            page.fill("#tag_them", tag)
            page.click("#nut_them_tag")
            page.wait_for_timeout(400)
        except Exception:
            pass

    # ---- LƯU LẦN 2 sau khi thêm hashtag (đúng quy trình web yêu cầu:
    # nhập nội dung -> lưu -> thêm hashtag -> lưu lại lần nữa). Việc thêm
    # hashtag ở trên có thể khiến giao diện "nhảy"/mất đồng bộ vài field
    # chưa persist — bấm "Đồng ý" lại lần nữa để chắc chắn mọi thứ (kể cả
    # sau khi tag đã thêm) đều được lưu đầy đủ xuống DB. ----
    page.evaluate(f"gianhang_sua_tin_moi({post_id})")
    page.wait_for_timeout(2500)

    # ---- XÁC MINH: tải lại trang, kiểm tra nội dung THỰC SỰ đã được lưu
    # xuống DB (không rỗng) — tránh tình trạng báo "OK" nhưng bài trống,
    # ví dụ nếu bước thêm hashtag ở trên lỡ làm mất dữ liệu chưa lưu kịp. ----
    page.goto(BLOG_DETAIL_URL.format(id=post_id), wait_until="networkidle", timeout=60000)
    if not wait_tinymce_ready(page):
        raise RuntimeError("Không xác minh được nội dung sau khi lưu (TinyMCE không load lại kịp).")
    saved_len = page.evaluate(
        """() => {
            const ed = tinymce.editors.find(e => e.targetElm && e.targetElm.name === 'detail');
            return ed ? ed.getContent().replace(/<[^>]*>/g, '').trim().length : 0;
        }"""
    )
    if saved_len < 100:
        DEBUG_DIR.mkdir(exist_ok=True)
        page.screenshot(path=str(DEBUG_DIR / f"empty_content_after_save_{post_id}.png"), full_page=True)
        raise RuntimeError(
            f"Bài id={post_id} đã lưu nhưng NỘI DUNG RỖNG (chỉ {saved_len} ký tự chữ sau khi lưu). "
            f"Không đánh dấu POSTED để bạn có thể xử lý lại thủ công."
        )


# ============ QUẢN LÝ HÀNG ĐỢI CHỦ ĐỀ / LOG ============

def load_topics() -> list:
    if not TOPICS_FILE.exists():
        raise SystemExit(f"Không tìm thấy {TOPICS_FILE}. Chạy generate_topic_calendar.py trước.")
    with open(TOPICS_FILE, newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def save_topics(rows: list) -> None:
    with open(TOPICS_FILE, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["date", "week_type", "category", "topic", "status", "post_id", "url"])
        writer.writeheader()
        for r in rows:
            r.setdefault("post_id", "")
            r.setdefault("url", "")
            writer.writerow(r)


def append_log(row: dict) -> None:
    is_new = not LOG_FILE.exists()
    with open(LOG_FILE, "a", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["date", "topic", "status", "post_id", "note"])
        if is_new:
            writer.writeheader()
        writer.writerow(row)


def load_used_post_ids(rows: list) -> set:
    """Tập hợp mọi post_id đã từng đăng thành công trước đó — dùng để chặn
    create_new_post() lỡ trả về ID trùng, tránh đè nội dung bài cũ.
    Gộp cả từ topics_queue.csv (cột post_id) lẫn blog_post_log.csv (status OK),
    vì 2 nguồn có thể lệch nhau nếu script từng bị ngắt giữa chừng."""
    used = {r["post_id"] for r in rows if r.get("post_id")}
    if LOG_FILE.exists():
        with open(LOG_FILE, newline="", encoding="utf-8") as f:
            for r in csv.DictReader(f):
                if r.get("status") == "OK" and r.get("post_id"):
                    used.add(r["post_id"])
    return used


def do_run(count: int):
    if ENABLE_AI_IMAGES and IMAGE_SOURCE_MODE == "api" and IMAGE_API_MODE != "local_gateway" and not IMAGE_API_KEY:
        print(
            f"CẢNH BÁO: IMAGE_SOURCE_MODE='api' (IMAGE_API_MODE='{IMAGE_API_MODE}') nhưng "
            "IMAGE_API_KEY đang để trống.\n"
            "  -> Mọi lần sinh ảnh sẽ lỗi 401/403 (nhưng không làm gãy bài, chỉ bỏ qua ảnh).\n"
            "  -> Lấy key tại https://aistudio.google.com/apikey rồi điền vào IMAGE_API_KEY, "
            "hoặc đặt ENABLE_AI_IMAGES = False để tắt.\n"
        )
    if ENABLE_AI_IMAGES and IMAGE_SOURCE_MODE == "local_library":
        n_imgs = len(pick_local_images(9999))
        if n_imgs == 0:
            print(
                f"CẢNH BÁO: IMAGE_SOURCE_MODE='local_library' nhưng thư mục "
                f"'{IMAGE_LIBRARY_DIR}' chưa có ảnh nào -> mọi bài sẽ không có ảnh.\n"
            )

    rows = load_topics()
    rows = ensure_pending_topics(rows, count)  # TỰ SINH thêm chủ đề bằng Gemini nếu thiếu
    pending = [r for r in rows if r.get("status") == "PENDING"]
    if not pending:
        print("Không tạo được chủ đề PENDING nào (Gemini lỗi liên tục) — kiểm tra lại "
              "GEMINI_API_URL/gemini_web2api_server có đang chạy không.")
        return
    batch = pending[:count]
    print(f"Sẽ đăng {len(batch)} bài trong lần chạy này.")

    used_post_ids = load_used_post_ids(rows)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=HEADLESS_RUN)
        context = browser.new_context(storage_state=str(STATE_FILE))
        page = context.new_page()

        for row in batch:
            topic = row["topic"]
            print(f"-> Đang xử lý: {topic}")
            try:
                blog_data = call_gemini_blog(topic, row["week_type"], row["category"])
                blog_data["topic"] = topic  # dùng làm gợi ý khi sinh ảnh minh hoạ
                post_id = create_new_post(page, blog_data["h1_title"], used_post_ids)
                page.goto(BLOG_DETAIL_URL.format(id=post_id), wait_until="networkidle", timeout=60000)
                fill_and_save_post(page, post_id, blog_data)

                used_post_ids.add(post_id)  # đánh dấu ngay để lần lặp kế trong CÙNG lần chạy cũng được chặn
                row["status"] = "POSTED"
                row["post_id"] = post_id
                row["url"] = f"{BASE_URL}/{blog_data.get('slug', '')}.html"
                append_log({"date": row["date"], "topic": topic, "status": "OK", "post_id": post_id, "note": ""})
                print(f"   OK: đã đăng bài id={post_id}")

            except Exception as e:
                append_log({"date": row["date"], "topic": topic, "status": "FAIL", "post_id": "", "note": str(e)[:200]})
                print(f"   LỖI: {e}")

                # Nếu browser/trang đã đóng (crash, hoặc bị đóng tay giữa
                # chừng), MỌI thao tác tiếp theo cũng sẽ lỗi y hệt -> dừng
                # hẳn vòng lặp thay vì cố chạy tiếp các bài còn lại vô ích.
                if page.is_closed() or "has been closed" in str(e):
                    print(
                        "\n>>> DỪNG SỚM: trình duyệt/trang đã bị đóng (crash hoặc bị đóng tay). "
                        "Không thể tiếp tục xử lý các bài còn lại trong lô này. Chạy lại lệnh "
                        "--run — các bài chưa xử lý vẫn còn PENDING nên sẽ không bị bỏ sót.\n"
                    )
                    save_topics(rows)
                    return

                try:
                    DEBUG_DIR.mkdir(exist_ok=True)
                    page.screenshot(path=str(DEBUG_DIR / f"error_{row['date']}.png"), full_page=True)
                except Exception:
                    pass

            save_topics(rows)  # lưu tiến độ ngay sau mỗi bài, không mất dữ liệu nếu bị ngắt giữa chừng
            time.sleep(random.uniform(*DELAY_SECONDS))

        browser.close()
    print("Hoàn tất. Xem topics_queue.csv (cột status/post_id/url) và blog_post_log.csv.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--run", action="store_true", required=True, help="Đăng bài tiếp theo trong hàng đợi")
    parser.add_argument("--count", type=int, default=1, help="Số bài muốn đăng trong lần chạy này (mặc định 1/ngày)")
    args = parser.parse_args()
    do_run(args.count)
