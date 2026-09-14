"""
auto_rewrite_products.py
=========================
Tự động viết lại nội dung mô tả sản phẩm trên vipsextoy.net (nền tảng
TaoWebTrongGoi) bằng Gemini API chính thức (Google AI Studio), chuẩn SEO
2026 + AEO/GEO (tối ưu cho cả Google lẫn AI Overviews/ChatGPT/Gemini/
Perplexity), sau đó tự bấm Lưu, và lặp cho toàn bộ / một khoảng sản phẩm
trong danh sách.

CÁCH DÙNG
---------
1) Cài thư viện (một lần):
     pip install playwright requests pandas
     playwright install chromium

2) Lấy VÀI API key Gemini MIỄN PHÍ tại https://aistudio.google.com/apikey
   (mỗi tài khoản Google tạo được key riêng, nên có thể dùng nhiều Gmail).
   Tạo file "gemini_api_keys.txt" cùng thư mục với script, MỖI DÒNG 1 KEY.
   Script sẽ TỰ XOAY VÒNG qua các key này, và tự bỏ qua key nào báo hết
   quota trong ngày để chuyển sang key tiếp theo. Ước lượng: mỗi key free
   ~24 request/ngày với model 3.6-flash, mà MỖI SẢN PHẨM tốn khoảng 2-3
   request (viết lại nội dung + SEO meta + alt ảnh), nên chạy 100 sản
   phẩm/ngày cần khoảng 10-15 key (không phải 5) — cứ thêm dòng key vào
   file là được, không giới hạn số lượng.

3) Chuẩn bị 2 file (cùng thư mục với script):
   - product_ids.txt   : mỗi dòng 1 ID sản phẩm cần viết lại
   - product_meta.csv  : (khuyến nghị) cột id,title,category,url — lấy từ
     file Export Excel của trang sanpham_sua. Có file này giúp Gemini biết
     chính xác tên sản phẩm + danh mục + URL thật để gợi ý internal link,
     KHÔNG cần đoán tiêu đề từ trang web nữa (đỡ lỗi/chính xác hơn).

4) Đăng nhập một lần để lưu phiên đăng nhập (mở trình duyệt có giao diện):
     python auto_rewrite_products.py --login

5) Chạy tự động, có thể chia nhỏ theo lô để index tự nhiên hơn:
     python auto_rewrite_products.py --run                  # chạy hết
     python auto_rewrite_products.py --run --start 1 --end 100    # lô 1
     python auto_rewrite_products.py --run --start 1151 --end 1200 # lô 2 (hôm sau)

   --start/--end tính theo VỊ TRÍ dòng trong product_ids.txt (1-indexed,
   bao gồm cả 2 đầu). Kết hợp RESUME=True (mặc định) nên ID đã có status
   OK trong rewrite_log.csv sẽ tự bị bỏ qua dù có nằm trong khoảng đó.

GHI CHÚ QUAN TRỌNG
------------------
- Trang chỉnh sửa trực tiếp: .../gianhang_sanphamchitiet.php?id={ID}&quanlytructiep=1
- Nội dung soạn thảo dùng TinyMCE, thao tác qua API JS
  `tinymce.activeEditor.getContent()/setContent()`.
- Nút lưu tìm theo TEXT "Lưu thông tin" — chỉnh SELECTOR_SAVE_BUTTON nếu khác.
- Có delay ngẫu nhiên giữa các sản phẩm để tránh chạy quá máy móc.
"""

import argparse
import csv
import os
import random
import re
import sys
import time
import unicodedata
from pathlib import Path

import requests
from playwright.sync_api import sync_playwright

# ============ CẤU HÌNH — chỉnh theo thực tế của bạn ============

BASE_URL = "https://vipsextoy.net"
BASE_EDIT_URL = BASE_URL + "/gianhang_sanphamchitiet.php?id={id}&quanlytructiep=1"
LOGIN_URL = BASE_URL + "/admin.php"

GEMINI_MODEL = "gemini-3.6-flash"  # model Gemini chính thức (Google AI Studio)

# ==================================================================
# 👉 NHẬP NHIỀU API KEY GEMINI VÀO ĐÂY để script TỰ XOAY VÒNG khi 1 key
# hết quota trong ngày (mỗi API key free thường chỉ được ~24 request/ngày
# với model 3.6, nên chạy nhiều sản phẩm/ngày cần nhiều key).
#
# CÁCH 1 (khuyên dùng) — tạo file "gemini_api_keys.txt" cùng thư mục với
# script này, MỖI DÒNG 1 KEY, ví dụ:
#   AIzaSyABC111...
#   AIzaSyDEF222...
#   AIzaSyGHI333...
# Script sẽ tự đọc file này nếu tồn tại (ưu tiên hơn danh sách bên dưới).
#
# CÁCH 2 — điền thẳng vào danh sách Python bên dưới (giữa dấu ngoặc kép,
# cách nhau bằng dấu phẩy):
GEMINI_API_KEYS = [
    "AQ.Ab8RN6L_U2kuSvLU1HMuREKpriFolYodzurHThRCeo_lsoFE6w",
    "AQ.Ab8RN6K8qKNdsWfPpClWVGm54j6q6ysONiiSKZT7mdHSQ1_XsQ",
    "AQ.Ab8RN6J-ruVU8T66l8TFXLhKSuZktgsUNGBcLNzAOCvQeBXMNw",
    "AQ.Ab8RN6JZUG1VIAHIeGB_e0hLorJO7ZuoVCdJL6mWNXQRjQkptA",
    "AQ.Ab8RN6JxJ3yGlRFloKSAK1djd_LyDzacS1BtaxURRWfc6-LWSw",
    "AQ.Ab8RN6KgLCZ_RwHUqIaoR5PZv84cUjG6tGX1aZrqdsWhTGR0Bw",
    "AQ.Ab8RN6Kykbo5WlB3EICqA-Vci4r6jjxC7_0PlCS5kD4LeGpAqA",
    "AQ.Ab8RN6Ih5JAcftowIjDjHZAahufjF1rAnZgaE8wZZu3tFdLSAQ",
    "AQ.Ab8RN6LIQMdUWxz8OKxIsyosjyGxDSJ4-hPIyXeS5ZYGakhi3A",
    "AQ.Ab8RN6JC1atxmWJZC8C5_hMp23-O0MHCQF_MnPROLYqm3er26w",
    "AQ.Ab8RN6IiOtfwyyyk9d6rdW_WLxEXuJloJNPruKRwk9qsPZxIGw",

    # "DÁN_API_KEY_GEMINI_SỐ_3_VÀO_ĐÂY",   # thêm bao nhiêu key cũng được, cứ thêm dòng
]
# Lấy API key miễn phí (nhiều tài khoản Google = nhiều key) tại:
# https://aistudio.google.com/apikey
#
# Cũng có thể set biến môi trường GEMINI_API_KEYS (nhiều key cách nhau bằng
# dấu phẩy) thay vì sửa file — nếu có, biến môi trường sẽ được ưu tiên nhất.
# ==================================================================

GEMINI_API_KEYS_FILE = Path(__file__).parent / "gemini_api_keys.txt"


def _load_gemini_api_keys() -> list:
    """Thứ tự ưu tiên: biến môi trường GEMINI_API_KEYS (phân cách bằng dấu
    phẩy) > file gemini_api_keys.txt (mỗi dòng 1 key) > danh sách hardcode
    GEMINI_API_KEYS ở trên. Tự loại bỏ dòng trống/placeholder chưa điền."""
    env_val = os.environ.get("GEMINI_API_KEYS", "").strip()
    if env_val:
        keys = [k.strip() for k in env_val.split(",") if k.strip()]
        if keys:
            return keys

    if GEMINI_API_KEYS_FILE.exists():
        keys = [
            line.strip()
            for line in GEMINI_API_KEYS_FILE.read_text(encoding="utf-8").splitlines()
            if line.strip() and not line.strip().startswith("#")
        ]
        if keys:
            return keys

    return [k for k in GEMINI_API_KEYS if k and "DÁN_API_KEY" not in k]


GEMINI_API_KEYS = _load_gemini_api_keys()

GEMINI_API_URL = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent"

# Gemini API chính thức có giới hạn quota (request/phút VÀ request/ngày) theo
# TỪNG API key - script CHỦ ĐỘNG tự giãn nhịp gọi để tránh bị 429 (rate limit
# phút), đồng thời TỰ XOAY VÒNG qua danh sách GEMINI_API_KEYS ở trên khi 1 key
# báo hết quota ngày (xem hàm call_gemini_web2api).
GEMINI_MIN_INTERVAL_SEC = 9.0  # khoảng cách tối thiểu giữa 2 lượt gọi Gemini LIÊN TIẾP
                                 # của riêng script này (~10 lượt/phút) - áp dụng cho TỪNG
                                 # lượt gọi (rewrite/seo_meta/alt_text), không chỉ giữa các
                                 # sản phẩm, vì 3 lượt gọi trong cùng 1 sản phẩm trước đây
                                 # bắn liên tiếp không nghỉ.

PRODUCT_IDS_FILE = Path(__file__).parent / "product_ids.txt"
PRODUCT_META_FILE = Path(__file__).parent / "product_meta.csv"  # tùy chọn, nên có
STATE_FILE = Path(__file__).parent / "state.json"
LOG_FILE = Path(__file__).parent / "rewrite_log.csv"
DEBUG_DIR = Path(__file__).parent / "debug"

PRODUCT_LIST_URL = BASE_URL + "/admin.php?f=sanpham_sua"  # dùng làm "điểm xuất phát" / referer hợp lệ

DELAY_SECONDS = (15, 30)  # nghỉ ngẫu nhiên giữa các sản phẩm (giây) - tăng nhẹ để giảm
                            # bớt lỗi 503 "high demand" từ Gemini khi chạy dồn dập
RESUME = True  # True: bỏ qua ID đã có trong rewrite_log.csv (status=OK)
HEADLESS_RUN = True  # False nếu muốn xem trình duyệt chạy khi --run

# Selector nút lưu — chỉnh nếu không khớp thực tế
SELECTOR_SAVE_BUTTON = "text=Lưu thông tin"

# ============ PROMPT GỬI GEMINI — chuẩn SEO + AEO/GEO 2026 ============

SYSTEM_PROMPT = """Bạn là chuyên gia Content SEO & GEO (Generative Engine Optimization) cho
một shop thương mại điện tử bán đồ chơi người lớn (sextoy) hợp pháp tại
Việt Nam. Nhiệm vụ: viết lại mô tả chi tiết sản phẩm (HTML) để tối ưu cho
CẢ Google truyền thống LẪN các AI trả lời (Google AI Overviews, ChatGPT,
Gemini, Perplexity...).

QUY TẮC NỘI DUNG:
- Giọng văn chuyên nghiệp, tinh tế, tập trung vào: chất liệu, công nghệ,
  tính năng, công dụng, cách dùng cơ bản, cách vệ sinh/bảo quản, cam kết
  bảo hành/bảo mật đơn hàng. TUYỆT ĐỐI không viết nội dung khiêu dâm,
  tường thuật tình dục lộ liễu hay ngôn từ phản cảm — giữ văn phong như
  mô tả sản phẩm chăm sóc sức khoẻ cá nhân cao cấp.
- CHỈ dùng thông tin/số liệu đã có trong mô tả gốc (kích thước, chế độ
  rung, chất liệu, công nghệ...). TUYỆT ĐỐI KHÔNG bịa ra thông số, chứng
  nhận, hay tính năng không có trong bản gốc.
- Mỗi sản phẩm phải có nội dung THỰC SỰ KHÁC BIỆT, không dùng khung câu
  sáo rỗng lặp lại y hệt giữa các sản phẩm (tránh bị Google coi là
  "scaled content" / nội dung nhân bản hàng loạt).

CHUẨN SEO ON-PAGE:
- Có thẻ H2/H3 hợp lý, đoạn văn ngắn 2-4 câu, bullet list liệt kê tính
  năng/ưu điểm, chèn từ khoá liên quan đến tên + danh mục sản phẩm một
  cách tự nhiên (không nhồi nhét từ khoá).
- BẮT BUỘC theo đúng bố cục được chỉ định trong phần "Yêu cầu bố cục" bên
  dưới (bố cục sẽ khác nhau giữa các lần gọi để tránh trùng khung mẫu).

CHUẨN AEO/GEO (tối ưu cho AI trả lời):
- BẮT BUỘC có một đoạn "trả lời trực tiếp" 1-2 câu ngay đầu bài, đứng
  độc lập được, trả lời thẳng câu hỏi "Sản phẩm này là gì / dùng để làm
  gì" — vì đây là dạng đoạn AI hay trích dẫn nhất.
- BẮT BUỘC có khối FAQ gồm 3 câu hỏi thường gặp + câu trả lời ngắn gọn
  (2-3 câu/câu trả lời), dùng thẻ <h3> cho câu hỏi. Câu hỏi nên là dạng
  người dùng thật sự hay hỏi AI (vd "Sản phẩm này có phù hợp với người
  mới không?", "Vệ sinh như thế nào?", "Có ồn không?"...).
- Ưu tiên số liệu, sự thật cụ thể, nhất quán hơn là câu marketing mơ hồ.
- Nhắc tên thương hiệu/công nghệ chính xác, nhất quán (không viết tắt
  hay đổi tên khác đi giữa các đoạn).

INTERNAL LINK:
- Nếu được cung cấp danh sách sản phẩm liên quan (kèm URL), hãy chèn ĐÚNG
  số lượng link được cung cấp (thường là 2) dưới dạng thẻ <a href="...">
  vào các vị trí TỰ NHIÊN, phù hợp ngữ cảnh trong bài — KHÔNG dồn cả 2
  link vào cùng một câu cuối bài kiểu danh sách liệt kê.
- Anchor text (chữ hiển thị link) của mỗi link PHẢI khác nhau, viết tự
  nhiên theo tên sản phẩm liên quan đó (VD "dòng sản phẩm mini cùng
  thương hiệu", không lặp lại nguyên văn tên sản phẩm y hệt kiểu nhồi
  từ khoá).
- Nếu không có sản phẩm liên quan nào được cung cấp, bỏ qua phần này,
  KHÔNG tự bịa link hay URL.

ĐỊNH DẠNG XUẤT:
- Trả về THUẦN HTML (dùng <h2>, <h3>, <p>, <ul><li>, <a>), không kèm
  markdown, không kèm giải thích, không kèm ```html.
- TUYỆT ĐỐI KHÔNG tự chèn thẻ <img> vào nội dung, kể cả khi bản mô tả gốc
  có ảnh. Hệ thống sẽ tự động chèn đúng ảnh sản phẩm (kèm alt text) vào
  vị trí phù hợp sau khi bạn viết xong — bạn chỉ cần lo phần chữ.
"""

# Các biến thể bố cục — script tự chọn ngẫu nhiên 1 cái mỗi lần gọi để
# tránh tất cả sản phẩm có cấu trúc y hệt nhau (chống scaled-content).
STRUCTURE_VARIANTS = [
    "Đoạn trả lời trực tiếp mở đầu -> H2 'Tính năng nổi bật' (bullet) -> "
    "H2 'Chất liệu & công nghệ' (đoạn văn) -> H2 'Hướng dẫn sử dụng & vệ sinh' "
    "(bullet) -> H2 'Câu hỏi thường gặp' (3 cặp H3/đoạn văn).",

    "Đoạn trả lời trực tiếp mở đầu -> H2 'Vì sao nên chọn [tên sản phẩm]' "
    "(đoạn văn ngắn) -> H2 'Thông số & chất liệu' (bullet) -> H2 'Cách dùng "
    "hiệu quả' (đoạn văn) -> H2 'Câu hỏi thường gặp' (3 cặp H3/đoạn văn).",

    "Đoạn trả lời trực tiếp mở đầu -> H2 'Điểm nổi bật' (bullet ngắn 4-5 ý) "
    "-> H2 'Trải nghiệm sử dụng' (đoạn văn) -> H2 'Bảo quản & vệ sinh' "
    "(bullet) -> H2 'Câu hỏi thường gặp' (3 cặp H3/đoạn văn).",

    "Đoạn trả lời trực tiếp mở đầu -> H2 'Thiết kế & chất liệu' (đoạn văn) "
    "-> H2 'Công dụng thực tế' (bullet) -> H2 'Ai nên dùng sản phẩm này' "
    "(đoạn văn ngắn) -> H2 'Câu hỏi thường gặp' (3 cặp H3/đoạn văn).",

    "Đoạn trả lời trực tiếp mở đầu -> H2 'Thông số kỹ thuật' (bullet) -> "
    "H2 'Trải nghiệm khác biệt' (đoạn văn) -> H2 'Mẹo dùng & bảo quản' "
    "(bullet ngắn) -> H2 'Câu hỏi thường gặp' (3 cặp H3/đoạn văn).",

    "Đoạn trả lời trực tiếp mở đầu -> H2 'Ưu điểm chính' (bullet) -> H2 "
    "'Cảm nhận khi sử dụng' (đoạn văn) -> H2 'Hướng dẫn vệ sinh đúng cách' "
    "(đoạn văn) -> H2 'Câu hỏi thường gặp' (3 cặp H3/đoạn văn).",
]

# Giọng văn — xoay ngẫu nhiên để câu chữ giữa các sản phẩm không na ná nhau.
TONE_VARIANTS = [
    "chuyên nghiệp, điềm đạm, như tư vấn viên y tế/sức khoẻ cá nhân",
    "gần gũi, thân thiện, như đang tư vấn trực tiếp cho khách hàng mới",
    "tập trung dữ liệu kỹ thuật, ít cảm thán, thiên về thông số và sự thật",
    "tự tin, súc tích, câu ngắn, đi thẳng vào lợi ích cho người dùng",
]

# Góc nhấn mạnh nội dung — buộc mỗi bài xoáy vào 1 khía cạnh khác nhau,
# tránh tất cả sản phẩm đều nói giống hệt về "chất liệu an toàn".
FOCUS_ANGLE_VARIANTS = [
    "nhấn mạnh sự an toàn của chất liệu và tiêu chuẩn kiểm định",
    "nhấn mạnh trải nghiệm thực tế và cảm giác khi sử dụng",
    "nhấn mạnh sự tiện lợi, dễ dùng cho người mới bắt đầu",
    "nhấn mạnh độ bền, khả năng vệ sinh và bảo quản lâu dài",
    "nhấn mạnh thiết kế/công nghệ đặc trưng của sản phẩm",
]

# Kiểu câu mở đầu (đoạn trả lời trực tiếp) — tránh mọi bài đều mở kiểu
# "X là sản phẩm...".
OPENING_HOOK_VARIANTS = [
    "mở bài bằng cách trả lời thẳng câu hỏi sản phẩm dùng để làm gì",
    "mở bài bằng 1 câu nêu vấn đề/nhu cầu người dùng đang gặp, rồi dẫn vào sản phẩm",
    "mở bài bằng cách nêu điểm khác biệt lớn nhất của sản phẩm so với loại thông thường",
    "mở bài bằng cách mô tả nhanh đối tượng phù hợp nhất với sản phẩm này",
]

ALT_SYSTEM_PROMPT = """Bạn viết thuộc tính "alt" (mô tả ảnh) cho ảnh sản phẩm
thương mại điện tử đồ chơi người lớn hợp pháp tại Việt Nam.

QUY TẮC:
- Mỗi alt text 6-14 từ tiếng Việt, chứa tên sản phẩm hoặc từ khoá chính,
  mô tả NGẮN GỌN nội dung/góc chụp của ảnh đó (vd: ảnh so sánh kích thước,
  ảnh bao bì, ảnh cận cảnh chất liệu, ảnh full sản phẩm...).
- Văn phong trung tính, chuyên nghiệp như mô tả sản phẩm chăm sóc sức khoẻ
  cá nhân — KHÔNG dùng ngôn từ khiêu dâm hay phản cảm.
- Không bịa chi tiết không xác định được từ tên file (vì bạn không thấy
  ảnh thật), chỉ mô tả chung chung nhưng vẫn gắn với tên sản phẩm + số
  thứ tự ảnh (ảnh 1, ảnh 2...).
- Mỗi alt PHẢI khác nhau, không lặp lại y hệt giữa các ảnh.

ĐỊNH DẠNG XUẤT: CHỈ trả về JSON thuần, dạng
{"tên_file_1.jpg": "alt text 1", "tên_file_2.jpg": "alt text 2", ...}
Không kèm markdown, không kèm ```json, không kèm giải thích.
"""

USER_PROMPT_TEMPLATE = """Tên sản phẩm: {title}
Danh mục: {category}
{related_link_hint}

Yêu cầu cho lần viết này (PHẢI tuân thủ để nội dung không trùng khuôn với
các sản phẩm khác đã viết trước đó):
- Bố cục: {structure}
- Giọng văn: {tone}
- Góc nhấn mạnh chính xuyên suốt bài: {focus}
- Kiểu mở đầu đoạn trả lời trực tiếp: {opening_hook}

Mô tả HTML hiện tại (cần viết lại theo văn phong mới, không copy nguyên câu):
---
{old_content}
---

Hãy viết lại toàn bộ mô tả chi tiết trên theo đúng yêu cầu ở system prompt
và đúng bố cục/giọng văn/góc nhấn/kiểu mở đầu được chỉ định ở trên.
"""


def load_product_meta() -> dict:
    """Đọc product_meta.csv (nếu có): id -> {title, category, url}."""
    meta = {}
    if not PRODUCT_META_FILE.exists():
        return meta
    with open(PRODUCT_META_FILE, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            pid = str(row.get("id", "")).strip()
            if pid:
                meta[pid] = {
                    "title": row.get("title", "").strip(),
                    "category": row.get("category", "").strip(),
                    "url": row.get("url", "").strip(),
                }
    return meta


def pick_related_links(meta: dict, current_pid: str, category: str, count: int = 2) -> list:
    """Chọn ngẫu nhiên `count` sản phẩm liên quan để làm internal link.
    Ưu tiên CÙNG DANH MỤC với sản phẩm hiện tại (tốt cho SEO — link tới
    nội dung liên quan chủ đề). Nếu danh mục đó không đủ sản phẩm, bù
    thêm ngẫu nhiên từ toàn bộ catalog (loại trừ chính sản phẩm hiện tại
    và các sản phẩm không có URL)."""
    if not meta:
        return []

    candidates_same_cat = [
        {"title": info["title"], "url": info["url"]}
        for pid, info in meta.items()
        if pid != current_pid and info.get("url") and category and info.get("category") == category
    ]
    random.shuffle(candidates_same_cat)
    picked = candidates_same_cat[:count]

    if len(picked) < count:
        already_urls = {p["url"] for p in picked}
        candidates_any = [
            {"title": info["title"], "url": info["url"]}
            for pid, info in meta.items()
            if pid != current_pid and info.get("url") and info["url"] not in already_urls
        ]
        random.shuffle(candidates_any)
        picked += candidates_any[: count - len(picked)]

    return picked[:count]


def clean_seo_title(raw_title: str) -> str:
    """Bỏ mã sản phẩm dạng '(MS32M)', '(G32C)', '(DC90BG)'... ở CUỐI tiêu
    đề — mã sản phẩm không có giá trị SEO, chỉ làm tiêu đề dài/rối, khách
    tìm kiếm không ai gõ đúng mã này. Chỉ bỏ khi đúng dạng mã (chữ+số
    ngắn trong ngoặc ở cuối câu), KHÔNG đụng vào ngoặc đơn chứa nội dung
    thật (vd '(loại nhỏ)') vì đó có thể là thông tin hữu ích cho khách."""
    cleaned = re.sub(r"\s*\([A-Za-z]{1,4}\d+[A-Za-z0-9]*\)\s*$", "", raw_title).strip()
    return cleaned if cleaned else raw_title


def slugify_fallback(text: str) -> str:
    """Tạo slug URL từ tiêu đề (bỏ dấu tiếng Việt, khoảng trắng -> gạch
    ngang) — dùng khi cần điền ô 'Url' trong khối SEO."""
    # PHẢI thay đ/Đ TRƯỚC khi encode ascii — 'đ' không tự tách dấu qua
    # NFKD như các ký tự có dấu khác (â, ê, ơ...), nên nếu thay sau thì
    # encode("ascii","ignore") đã lỡ xoá mất 'đ' rồi (VD "điều" -> "ieu"
    # thay vì "dieu").
    text = text.replace("đ", "d").replace("Đ", "D")
    nfkd = unicodedata.normalize("NFKD", text)
    ascii_text = nfkd.encode("ascii", "ignore").decode("ascii")
    slug = re.sub(r"[^a-zA-Z0-9\s-]", "", ascii_text).strip().lower()
    slug = re.sub(r"[\s_-]+", "-", slug)
    return slug.strip("-")


SEO_META_SYSTEM_PROMPT = """Bạn viết 3 trường SEO cho trang sản phẩm thương
mại điện tử đồ chơi người lớn hợp pháp tại Việt Nam, dựa trên tiêu đề sản
phẩm và nội dung mô tả đã có.

QUY TẮC:
- "seo_title": thẻ <title> hiển thị trên Google — TỐI ĐA 60 ký tự, chứa
  tên sản phẩm + 1 từ khoá phụ tự nhiên (VD "chính hãng", "giá tốt"),
  KHÔNG nhồi nhét từ khoá, KHÔNG chứa mã sản phẩm dạng (XX00X).
- "meta_description": mô tả hiển thị dưới tiêu đề trên Google — 120-160
  ký tự, tóm tắt lợi ích chính + kêu gọi hành động ngắn (VD "Xem ngay",
  "Đặt hàng kín đáo"), viết tự nhiên như người thật viết, KHÔNG sao chép
  nguyên câu từ nội dung.
- "keywords": 5-8 từ khoá liên quan, phân cách bởi dấu phẩy, gồm tên sản
  phẩm + biến thể + danh mục, không trùng lặp.
- Giọng văn trung tính, chuyên nghiệp như sản phẩm chăm sóc sức khoẻ cá
  nhân — KHÔNG dùng ngôn từ khiêu dâm hay phản cảm.

ĐỊNH DẠNG XUẤT: CHỈ trả về JSON thuần
{"seo_title": "...", "meta_description": "...", "keywords": "..."}
Không kèm markdown, không kèm ```json, không kèm giải thích.
"""


_last_gemini_call_ts = 0.0


def _gemini_rate_limit_wait():
    """Đảm bảo khoảng cách giữa 2 lượt gọi Gemini LIÊN TIẾP của script này
    >= GEMINI_MIN_INTERVAL_SEC, để tự bóp tốc độ, chừa chỗ thở cho dự án
    khác đang dùng chung server gemini-web2api. Thêm chút jitter ngẫu
    nhiên để tránh 2 script vô tình bắn trùng nhịp nhau."""
    global _last_gemini_call_ts
    min_gap = GEMINI_MIN_INTERVAL_SEC + random.uniform(0, 2.0)
    elapsed = time.time() - _last_gemini_call_ts
    if elapsed < min_gap:
        time.sleep(min_gap - elapsed)
    _last_gemini_call_ts = time.time()


_key_rotation_state = {"cursor": 0, "exhausted": set()}  # exhausted: các key đã báo hết quota NGÀY, bỏ qua tới hết phiên chạy


def _pick_gemini_key() -> str:
    """Chọn 1 API key theo kiểu xoay vòng (round-robin), tự bỏ qua các key
    đã bị đánh dấu hết quota ngày (RESOURCE_EXHAUSTED) trong phiên chạy này."""
    available = [k for k in GEMINI_API_KEYS if k not in _key_rotation_state["exhausted"]]
    if not available:
        raise RuntimeError(
            "TẤT CẢ API key trong danh sách đều đã hết quota hôm nay. Hãy đợi "
            "quota reset (thường theo giờ UTC, tức khoảng 7h sáng giờ VN hôm "
            "sau), hoặc thêm key mới vào gemini_api_keys.txt rồi chạy lại "
            "(script sẽ tự resume từ chỗ dở dang nhờ rewrite_log.csv)."
        )
    key = available[_key_rotation_state["cursor"] % len(available)]
    _key_rotation_state["cursor"] += 1
    return key


def _mark_key_exhausted(key: str):
    if key not in _key_rotation_state["exhausted"]:
        _key_rotation_state["exhausted"].add(key)
        remaining = len(GEMINI_API_KEYS) - len(_key_rotation_state["exhausted"])
        print(f"   -> 🔁 Key ...{key[-6:]} đã hết quota hôm nay — chuyển sang key khác ({remaining} key còn dùng được).")


def call_gemini_web2api(payload: dict, timeout: float, max_retries: int = None,
                          base_delay: float = 8.0) -> str:
    """Gọi Gemini API CHÍNH THỨC (Google AI Studio) qua endpoint generateContent,
    TỰ XOAY VÒNG qua danh sách GEMINI_API_KEYS. Vẫn giữ nguyên interface cũ
    (nhận payload kiểu OpenAI-style {model, temperature, messages: [...]})
    để 3 nơi gọi (rewrite/seo_meta/alt_texts) KHÔNG cần sửa gì thêm — hàm này
    tự chuyển đổi sang format của Gemini (system_instruction + contents/parts)
    và đọc lại kết quả từ "candidates".

    - Mỗi lượt gọi (kể cả retry) chọn 1 key theo round-robin qua _pick_gemini_key(),
      nên tải được RẢI ĐỀU qua nhiều key thay vì dồn hết vào 1 key.
    - Nếu Gemini báo HẾT QUOTA NGÀY cho 1 key (status RESOURCE_EXHAUSTED hoặc
      message có chữ "quota"), key đó bị đánh dấu "exhausted" và bỏ qua luôn
      cho các lượt gọi sau (không cần đợi lâu, thử ngay key tiếp theo).
    - Nếu 429 chỉ là giới hạn NGẮN HẠN (request/phút, không phải hết quota
      ngày) hoặc lỗi 500/502/503/504/timeout, vẫn retry với backoff như cũ
      (30s/60s/120s... cho rate-limit phút, 8s/16s/32s... cho lỗi server).
    - Đọc thẳng "error.message"/"error.status" trong response body để log ra
      LÝ DO THẬT thay vì chỉ có mã lỗi HTTP chung chung.

    KHÔNG retry vô hạn với lỗi 4xx khác (vd 400 sai API key) vì retry vô ích -
    cấu hình sai thì gọi lại bao nhiêu lần cũng vẫn sai y như vậy."""
    if not GEMINI_API_KEYS:
        raise RuntimeError(
            "Chưa có API key nào. Tạo file gemini_api_keys.txt (mỗi dòng 1 key) "
            "cùng thư mục với script, hoặc điền vào danh sách GEMINI_API_KEYS "
            "ở đầu file. Lấy key miễn phí tại https://aistudio.google.com/apikey"
        )

    # Mặc định số lần thử = số key * 2 (đủ để xoay hết vòng key nếu key đầu
    # tiên hết quota liên tục) + vài lần dự phòng cho lỗi server tạm thời.
    if max_retries is None:
        max_retries = max(5, len(GEMINI_API_KEYS) * 2 + 3)

    # Chuyển payload kiểu OpenAI-style (messages: system/user) sang format Gemini
    system_text = ""
    user_text = ""
    for m in payload.get("messages", []):
        if m.get("role") == "system":
            system_text = m.get("content", "")
        elif m.get("role") == "user":
            user_text = m.get("content", "")

    body = {
        "contents": [{"role": "user", "parts": [{"text": user_text}]}],
        "generationConfig": {"temperature": payload.get("temperature", 0.9)},
    }
    if system_text:
        body["system_instruction"] = {"parts": [{"text": system_text}]}

    headers = {"Content-Type": "application/json"}
    RETRYABLE_STATUS = {429, 500, 502, 503, 504}
    last_err = ""

    for attempt in range(1, max_retries + 1):
        key = _pick_gemini_key()
        url = f"{GEMINI_API_URL}?key={key}"
        was_rate_limited = False
        was_quota_exhausted = False
        try:
            _gemini_rate_limit_wait()
            resp = requests.post(url, json=body, headers=headers, timeout=timeout)
            if resp.ok:
                data = resp.json()
                candidates = data.get("candidates") or []
                if not candidates:
                    reason = data.get("promptFeedback", {}).get("blockReason", "không rõ lý do")
                    raise RuntimeError(f"Gemini không trả về nội dung (có thể bị chặn: {reason})")
                parts = candidates[0].get("content", {}).get("parts", [])
                text = "".join(p.get("text", "") for p in parts)
                return text or ""

            detail = ""
            err_status = ""
            try:
                err_json = resp.json().get("error", {})
                detail = err_json.get("message", "")
                err_status = err_json.get("status", "")
            except Exception:
                detail = resp.text[:300]

            if resp.status_code == 429:
                if err_status == "RESOURCE_EXHAUSTED" or "quota" in detail.lower():
                    was_quota_exhausted = True
                    _mark_key_exhausted(key)
                else:
                    was_rate_limited = True  # chỉ là giới hạn request/phút, key vẫn còn quota ngày

            last_err = f"HTTP {resp.status_code} {resp.reason}" + (f" - {detail}" if detail else "")

            if resp.status_code not in RETRYABLE_STATUS:
                raise RuntimeError(last_err)  # lỗi cấu hình (vd sai API key) - không có ích gì khi retry

        except requests.exceptions.Timeout:
            last_err = f"Timeout sau {timeout:.0f}s"
        except requests.exceptions.ConnectionError:
            last_err = "Không kết nối được tới Gemini API (kiểm tra mạng/internet)"

        if attempt < max_retries:
            if was_quota_exhausted:
                wait = 0  # key khác sẽ được chọn ngay ở vòng sau, không cần đợi
            elif was_rate_limited:
                wait = 30.0 * (2 ** (attempt - 1))  # 30s, 60s, 120s, 240s...
            else:
                wait = base_delay * (2 ** (attempt - 1))  # 8s, 16s, 32s, 64s...
            if wait > 0:
                print(f"   -> ⚠ Gemini lỗi (lần {attempt}/{max_retries}): {last_err} - đợi {wait:.0f}s rồi thử lại...")
                time.sleep(wait)
            else:
                print(f"   -> ⚠ Gemini lỗi (lần {attempt}/{max_retries}): {last_err} - thử ngay với key khác...")

    raise RuntimeError(f"Gemini API thất bại sau {max_retries} lần thử (đã xoay qua các key khả dụng). Lỗi cuối: {last_err}")


def call_gemini_seo_meta(clean_title: str, category: str, content_html: str) -> dict:
    """Gọi Gemini sinh 3 trường SEO (title tag/meta description/keywords)
    dựa trên tiêu đề đã làm sạch + nội dung vừa viết lại. Nếu lỗi, trả về
    {} và để do_run tự fallback (không làm gãy cả sản phẩm)."""
    # dùng bản content đã lược bớt để tiết kiệm token, không cần full bài
    content_excerpt = re.sub(r"<[^>]+>", " ", content_html)[:1500]

    user_msg = (
        f"Tên sản phẩm (đã làm sạch mã SP): {clean_title}\n"
        f"Danh mục: {category or '(không rõ)'}\n\n"
        f"Trích đoạn nội dung mô tả:\n{content_excerpt}\n\n"
        f"Hãy trả về JSON 3 trường như quy định ở system prompt."
    )

    payload = {
        "model": GEMINI_MODEL,
        "temperature": 0.6,
        "messages": [
            {"role": "system", "content": SEO_META_SYSTEM_PROMPT},
            {"role": "user", "content": user_msg},
        ],
        "stream": False,
    }

    try:
        content = call_gemini_web2api(payload, timeout=60).strip()
        if content.startswith("```"):
            content = content.strip("`")
            if content.lower().startswith("json"):
                content = content[4:]
        import json
        result = json.loads(content.strip())
        return {
            "seo_title": (result.get("seo_title") or "").strip()[:60],
            "meta_description": (result.get("meta_description") or "").strip()[:160],
            "keywords": (result.get("keywords") or "").strip(),
        }
    except Exception as e:
        print(f"   -> Cảnh báo: sinh SEO title/meta thất bại ({e}), dùng fallback đơn giản.")
        return {}


def call_gemini_rewrite(title: str, category: str, related_links: list, old_content: str) -> str:
    structure = random.choice(STRUCTURE_VARIANTS)
    tone = random.choice(TONE_VARIANTS)
    focus = random.choice(FOCUS_ANGLE_VARIANTS)
    opening_hook = random.choice(OPENING_HOOK_VARIANTS)
    if related_links:
        danh_sach_link = "\n".join(
            f'- Tên: {rl["title"]} | URL: {rl["url"]}' for rl in related_links
        )
        related_link_hint = (
            f"Danh sách {len(related_links)} sản phẩm liên quan để chèn internal "
            f"link (mỗi sản phẩm 1 link, anchor text khác nhau, chèn tự nhiên "
            f"trong bài, KHÔNG gộp chung 1 câu):\n{danh_sach_link}"
        )
    else:
        related_link_hint = "Không có sản phẩm liên quan để gợi ý internal link — bỏ qua phần internal link."

    payload = {
        "model": GEMINI_MODEL,
        # random hoá nhẹ temperature mỗi lần gọi (thay vì cố định 0.9) để
        # độ "phá cách" của văn phong cũng dao động giữa các sản phẩm
        "temperature": round(random.uniform(0.85, 1.05), 2),
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {
                "role": "user",
                "content": USER_PROMPT_TEMPLATE.format(
                    title=title,
                    category=category or "(không rõ)",
                    related_link_hint=related_link_hint,
                    structure=structure,
                    tone=tone,
                    focus=focus,
                    opening_hook=opening_hook,
                    old_content=old_content[:6000],
                ),
            },
        ],
        "stream": False,
    }
    content = call_gemini_web2api(payload, timeout=180)
    content = content.strip()
    if content.startswith("```"):
        content = content.strip("`")
        if content.lower().startswith("html"):
            content = content[4:]
    return content.strip()


def call_gemini_alt_texts(title: str, category: str, image_filenames: list) -> dict:
    """Gọi Gemini sinh alt text riêng cho từng file ảnh. Trả về {} nếu lỗi
    (script vẫn chạy tiếp, chỉ là alt sẽ để trống thay vì làm gãy toàn bộ lô)."""
    if not image_filenames:
        return {}

    danh_sach = "\n".join(f"- {fn}" for fn in image_filenames)
    user_msg = (
        f"Tên sản phẩm: {title}\n"
        f"Danh mục: {category or '(không rõ)'}\n\n"
        f"Danh sách file ảnh cần viết alt (đúng theo thứ tự trong sản phẩm):\n"
        f"{danh_sach}\n\n"
        f"Hãy trả về JSON map tên_file -> alt text như quy định ở system prompt."
    )

    payload = {
        "model": GEMINI_MODEL,
        "temperature": 0.7,
        "messages": [
            {"role": "system", "content": ALT_SYSTEM_PROMPT},
            {"role": "user", "content": user_msg},
        ],
        "stream": False,
    }

    try:
        content = call_gemini_web2api(payload, timeout=90).strip()
        if content.startswith("```"):
            content = content.strip("`")
            if content.lower().startswith("json"):
                content = content[4:]
        import json
        alt_map = json.loads(content.strip())
        # chỉ giữ lại các key hợp lệ (đúng tên file đã gửi đi)
        return {fn: alt_map[fn] for fn in image_filenames if fn in alt_map and alt_map[fn]}
    except Exception as e:
        print(f"   -> Cảnh báo: sinh alt text thất bại ({e}), bỏ qua alt cho lần này.")
        return {}


def get_product_image_filenames(page) -> list:
    """Lấy danh sách tên file ảnh thật (theo đúng thứ tự) từ khung
    'Ảnh đại diện' (ul#list) trên trang sửa sản phẩm — đúng nguồn ảnh mà
    nút mũi tên chenanh() dùng để chèn vào TinyMCE."""
    try:
        srcs = page.eval_on_selector_all(
            "#list img",
            "imgs => imgs.map(img => img.getAttribute('src'))",
        )
    except Exception:
        return []
    filenames = []
    for src in srcs:
        if not src:
            continue
        # bỏ query string kiểu ?r=123456, và bỏ tiền tố "100_" (ảnh thumbnail)
        clean = src.split("?")[0]
        fname = clean.rsplit("/", 1)[-1]
        fname = fname[4:] if fname.startswith("100_") else fname
        if fname not in filenames:
            filenames.append(fname)
    return filenames


def strip_stray_img_tags(html: str) -> str:
    """Xoá mọi thẻ <img> mà Gemini lỡ tự chèn (nếu có), để tránh trùng/lệch
    với khối ảnh do script tự chèn sau đó."""
    import re
    return re.sub(r"<img[^>]*/?>", "", html)


def build_image_gallery_html(image_dir_prefix: str, image_filenames: list, alt_map: dict) -> str:
    """Dựng sẵn khối <p><img .../></p> cho từng ảnh thật của sản phẩm, có
    alt text tương ứng (nếu Gemini không sinh được alt cho file nào thì
    để alt rỗng, KHÔNG bỏ ảnh đó)."""
    parts = []
    for fn in image_filenames:
        alt = alt_map.get(fn, "")
        parts.append(f'<p><img src="{image_dir_prefix}/{fn}" alt="{alt}"/></p>')
    return "\n".join(parts)


def insert_image_gallery(html: str, gallery_html: str) -> str:
    """Chèn khối ảnh vào vị trí hợp lý trong nội dung: ưu tiên ngay sau
    danh sách bullet đầu tiên (thường là khối thông số kỹ thuật, giống
    cấu trúc mô tả gốc), nếu không có </ul> thì chèn sau đoạn <p> thứ 2,
    nếu vẫn không có thì nối vào cuối nội dung."""
    if not gallery_html:
        return html

    idx = html.find("</ul>")
    if idx != -1:
        insert_at = idx + len("</ul>")
        return html[:insert_at] + "\n" + gallery_html + html[insert_at:]

    # fallback: chèn sau thẻ </p> thứ 2
    positions = [m.end() for m in __import__("re").finditer(r"</p>", html)]
    if len(positions) >= 2:
        insert_at = positions[1]
        return html[:insert_at] + "\n" + gallery_html + html[insert_at:]

    # fallback cuối: nối thêm vào cuối nội dung
    return html + "\n" + gallery_html


def wait_tinymce_ready(page, timeout_ms=15000) -> bool:
    """Chờ tới khi tinymce.activeEditor thực sự sẵn sàng (thay vì chờ cố định)."""
    try:
        page.wait_for_function(
            "() => window.tinymce && tinymce.activeEditor && tinymce.activeEditor.getContent().length > 0",
            timeout=timeout_ms,
        )
        return True
    except Exception:
        return False


def diagnose_tinymce_failure(page, pid) -> str:
    """Khi TinyMCE không load được, chụp lại ảnh + kiểm tra vài dấu hiệu
    thường gặp để biết NGUYÊN NHÂN THẬT (thay vì đoán mò):
    - Phiên đăng nhập hết hạn (site hiện form đăng nhập ngay tại URL đó,
      không hề redirect nên goto_product_page() vẫn tưởng là thành công).
    - Textarea #detail_mce không tồn tại trong DOM (đúng là trang lỗi/khác).
    - Trang bị chặn bởi WAF/anti-bot (nội dung rỗng bất thường).
    """
    note_parts = []
    try:
        has_editor_textarea = page.locator("#detail_mce").count() > 0
        note_parts.append(
            "textarea #detail_mce có tồn tại trong DOM" if has_editor_textarea
            else "KHÔNG tìm thấy textarea #detail_mce trong DOM (nghi ngờ trang không phải trang sửa sản phẩm thật)"
        )

        # Dấu hiệu trang đăng nhập: có ô mật khẩu hoặc chữ "đăng nhập"
        has_password_field = page.locator('input[type="password"]').count() > 0
        has_login_text = page.locator("text=/đăng nhập/i").count() > 0
        if has_password_field or has_login_text:
            note_parts.append("NGHI NGỜ CAO: trang đang hiện form/nội dung đăng nhập -> phiên (state.json) có thể đã hết hạn")

        page_title = page.title()
        note_parts.append(f"page.title()='{page_title}'")
    except Exception as e:
        note_parts.append(f"lỗi khi chẩn đoán: {e}")

    try:
        DEBUG_DIR.mkdir(exist_ok=True)
        shot_path = DEBUG_DIR / f"{pid}_tinymce_timeout.png"
        page.screenshot(path=str(shot_path), full_page=True)
        note_parts.append(f"đã lưu ảnh debug/{shot_path.name}")
    except Exception:
        pass

    return " | ".join(note_parts)


def is_on_product_page(page, pid) -> bool:
    url = page.url
    if "gianhang_sanphamchitiet.php" not in url:
        return False
    if f"id={pid}" not in url:
        return False
    return True


def goto_product_page(page, pid, log_debug=True) -> bool:
    url = BASE_EDIT_URL.format(id=pid)

    page.goto(url, referer=PRODUCT_LIST_URL, wait_until="networkidle", timeout=60000)
    if is_on_product_page(page, pid):
        return True

    page.goto(PRODUCT_LIST_URL, wait_until="networkidle", timeout=60000)
    page.wait_for_timeout(800)
    page.goto(url, referer=PRODUCT_LIST_URL, wait_until="networkidle", timeout=60000)
    if is_on_product_page(page, pid):
        return True

    if log_debug:
        DEBUG_DIR.mkdir(exist_ok=True)
        try:
            page.screenshot(path=str(DEBUG_DIR / f"{pid}_redirect.png"), full_page=True)
            (DEBUG_DIR / f"{pid}_url.txt").write_text(page.url, encoding="utf-8")
        except Exception:
            pass
    return False


def get_tinymce_content(page) -> str:
    return page.evaluate(
        "() => window.tinymce && tinymce.activeEditor ? tinymce.activeEditor.getContent() : ''"
    )


def set_tinymce_content(page, html: str) -> None:
    page.evaluate(
        "(html) => { if (window.tinymce && tinymce.activeEditor) { tinymce.activeEditor.setContent(html); tinymce.activeEditor.save(); } }",
        html,
    )


def _load_log_rows() -> dict:
    """Đọc rewrite_log.csv hiện có thành dict {id: row}, giữ đúng thứ tự xuất
    hiện lần đầu của từng ID. Dùng làm nền để cập nhật/ghi đè thay vì cứ nối
    thêm dòng mới mỗi lần chạy lại.

    Dùng encoding "utf-8-sig" (không phải "utf-8" thường) vì nếu file từng
    được mở/lưu lại bằng Excel, Excel hay tự thêm 1 ký tự BOM ẩn vào đầu file
    - "utf-8-sig" tự động bỏ ký tự đó đi, còn "utf-8" thường sẽ khiến cột đầu
    tiên bị đọc nhầm thành "\\ufeffid" thay vì "id", gây lỗi KeyError.

    Nếu vẫn gặp dòng hỏng/thiếu cột (vd file bị sửa tay dở dang) - BỎ QUA
    dòng đó kèm cảnh báo, thay vì crash cả chương trình giữa chừng."""
    rows = {}
    if LOG_FILE.exists():
        with open(LOG_FILE, newline="", encoding="utf-8-sig") as f:
            for i, row in enumerate(csv.DictReader(f), start=2):  # dòng 1 là header
                pid = row.get("id")
                if not pid:
                    print(f"   -> ⚠ Bỏ qua dòng {i} trong rewrite_log.csv (thiếu cột 'id', có thể file bị lỗi định dạng).")
                    continue
                rows[pid] = row
    return rows


def load_done_ids() -> set:
    if not RESUME or not LOG_FILE.exists():
        return set()
    return {pid for pid, row in _load_log_rows().items() if row.get("status") == "OK"}


def append_log(row: dict) -> None:
    """Ghi kết quả cho 1 ID vào rewrite_log.csv - CẬP NHẬT đè lên dòng cũ của
    đúng ID đó nếu đã có (vd lần trước FAIL, lần này chạy lại thành công),
    thay vì nối thêm dòng mới mỗi lần - tránh log phình to trùng lặp qua
    nhiều lần chạy lại lô cũ."""
    rows = _load_log_rows()
    rows[str(row["id"])] = row  # ghi đè nếu đã tồn tại, thêm mới nếu chưa có
    with open(LOG_FILE, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["id", "title", "status", "note"])
        writer.writeheader()
        for r in rows.values():
            writer.writerow(r)


def do_login():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        context = browser.new_context()
        page = context.new_page()
        page.goto(LOGIN_URL)
        print("\n>>> Hãy đăng nhập vào trang quản trị trong cửa sổ Chrome vừa mở.")
        input(">>> Sau khi đăng nhập thành công, quay lại đây và nhấn Enter... ")
        context.storage_state(path=str(STATE_FILE))
        print(f"Đã lưu phiên đăng nhập vào {STATE_FILE}")
        browser.close()


def do_run(start: int | None, end: int | None):
    if not PRODUCT_IDS_FILE.exists():
        print(f"Không tìm thấy {PRODUCT_IDS_FILE}. Hãy tạo file này, mỗi dòng 1 ID sản phẩm.")
        sys.exit(1)
    if not STATE_FILE.exists():
        print("Chưa có state.json — hãy chạy `python auto_rewrite_products.py --login` trước.")
        sys.exit(1)
    if not GEMINI_API_KEYS:
        print(
            "Chưa có API key Gemini nào. Tạo file gemini_api_keys.txt (mỗi dòng 1 "
            "key) cùng thư mục với script, hoặc điền vào danh sách GEMINI_API_KEYS "
            "ở đầu file. Lấy key miễn phí tại https://aistudio.google.com/apikey"
        )
        sys.exit(1)
    print(f"Đã nạp {len(GEMINI_API_KEYS)} API key Gemini, sẽ tự xoay vòng khi 1 key hết quota ngày.")

    ids_all = [line.strip() for line in PRODUCT_IDS_FILE.read_text(encoding="utf-8").splitlines() if line.strip()]

    # Cắt theo --start/--end (1-indexed, bao gồm cả 2 đầu) để chạy theo lô
    start_idx = (start - 1) if start else 0
    end_idx = end if end else len(ids_all)
    ids_batch = ids_all[start_idx:end_idx]
    print(f"Tổng file: {len(ids_all)} ID. Lô được chọn (--start {start or 1} --end {end or len(ids_all)}): {len(ids_batch)} ID.")

    meta = load_product_meta()
    if meta:
        print(f"Đã nạp product_meta.csv ({len(meta)} sản phẩm) để lấy tên/danh mục/URL chính xác.")
    else:
        print("Không có product_meta.csv — sẽ lấy tiêu đề từ thẻ <h1> trên trang (kém chính xác hơn).")

    done_ids = load_done_ids()
    todo = [i for i in ids_batch if i not in done_ids]
    print(f"Trong lô này: đã xong {len([i for i in ids_batch if i in done_ids])}, còn lại {len(todo)}.")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=HEADLESS_RUN)
        context = browser.new_context(storage_state=str(STATE_FILE))
        page = context.new_page()

        consecutive_login_suspect = 0

        for idx, pid in enumerate(todo, 1):
            print(f"[{idx}/{len(todo)}] ID {pid}")
            try:
                ok = goto_product_page(page, pid)
                if not ok:
                    append_log({
                        "id": pid, "title": "", "status": "SKIP",
                        "note": f"Bị chuyển hướng, không vào được trang sản phẩm (url cuối: {page.url})",
                    })
                    print(f"   -> SKIP: bị chuyển hướng tới {page.url}. Xem ảnh trong debug/{pid}_redirect.png")
                    time.sleep(random.uniform(*DELAY_SECONDS))
                    continue

                if not wait_tinymce_ready(page):
                    diag = diagnose_tinymce_failure(page, pid)
                    append_log({"id": pid, "title": "", "status": "SKIP", "note": f"TinyMCE không sẵn sàng sau 15s | {diag}"})
                    print(f"   -> SKIP: TinyMCE không load kịp. Chẩn đoán: {diag}")

                    if "NGHI NGỜ CAO" in diag:
                        consecutive_login_suspect += 1
                    else:
                        consecutive_login_suspect = 0

                    if consecutive_login_suspect >= 3:
                        print(
                            "\n>>> DỪNG SỚM: 3 sản phẩm liên tiếp đều có dấu hiệu phiên đăng "
                            "nhập đã hết hạn. Hãy chạy lại `python auto_rewrite_products.py "
                            "--login` để đăng nhập lại, sau đó chạy lại lệnh --run này (script "
                            "sẽ tự resume từ chỗ dở dang nhờ log.csv).\n"
                        )
                        break

                    time.sleep(random.uniform(*DELAY_SECONDS))
                    continue
                else:
                    consecutive_login_suspect = 0

                info = meta.get(pid, {})
                title = info.get("title", "")
                category = info.get("category", "")

                if not title:
                    try:
                        title = page.locator("h1").first.inner_text(timeout=5000)
                    except Exception:
                        title = f"Sản phẩm #{pid}"

                # 2 internal link ngẫu nhiên, ưu tiên cùng danh mục (tốt cho
                # SEO hơn random toàn site — vẫn "ngẫu nhiên" để tránh cả
                # loạt sản phẩm link y hệt nhau, nhưng luôn liên quan chủ đề)
                related_links = pick_related_links(meta, pid, category, count=2)

                old_content = get_tinymce_content(page)
                if not old_content:
                    append_log({"id": pid, "title": title, "status": "SKIP", "note": "Không đọc được nội dung TinyMCE"})
                    continue

                new_content = call_gemini_rewrite(title, category, related_links, old_content)
                if not new_content:
                    append_log({"id": pid, "title": title, "status": "FAIL", "note": "Gemini trả về rỗng"})
                    continue

                # ---- Ảnh sản phẩm + alt text ----
                # Gemini được dặn không tự chèn <img>, nhưng vẫn phòng
                # trường hợp nó lỡ chèn -> xoá sạch trước khi tự chèn lại
                # đúng ảnh thật của sản phẩm này.
                new_content = strip_stray_img_tags(new_content)

                image_filenames = get_product_image_filenames(page)
                if image_filenames:
                    alt_map = call_gemini_alt_texts(title, category, image_filenames)
                    image_dir_prefix = f"files/sanpham/{pid}"
                    gallery_html = build_image_gallery_html(image_dir_prefix, image_filenames, alt_map)
                    new_content = insert_image_gallery(new_content, gallery_html)
                else:
                    print("   -> Cảnh báo: không tìm thấy ảnh nào trong khung 'Ảnh đại diện' để chèn.")

                set_tinymce_content(page, new_content)
                page.wait_for_timeout(500)

                # ---- Tiêu đề: bỏ mã sản phẩm dạng (MS32M) khỏi tiêu đề
                # chính (#name), rồi sinh + điền khối "Cấu hình SEO &
                # chuyển hướng" (Title/Url/Meta keywords/Meta description)
                # — khối này trước giờ luôn bỏ trống, không tối ưu gì. ----
                clean_title = clean_seo_title(title)
                try:
                    page.fill("#name", clean_title)
                except Exception:
                    pass

                seo_meta = call_gemini_seo_meta(clean_title, category, new_content)
                seo_title = seo_meta.get("seo_title") or clean_title[:60]
                meta_description = seo_meta.get("meta_description") or ""
                keywords = seo_meta.get("keywords") or f"{clean_title}, {category}".strip(", ")
                slug = slugify_fallback(clean_title)

                try:
                    page.evaluate("document.getElementById('div_seo').style.display='block'")
                    page.fill("#title", seo_title)
                    page.fill("#seourl", slug)
                    page.fill("#keywords", keywords)
                    page.fill("#description", meta_description)
                except Exception as e:
                    print(f"   -> Cảnh báo: điền khối SEO thất bại ({e}), bỏ qua phần này.")

                save_btn = page.locator(SELECTOR_SAVE_BUTTON).first
                save_btn.click(timeout=10000)
                page.wait_for_timeout(2000)

                append_log({"id": pid, "title": clean_title, "status": "OK", "note": ""})
                print("   -> OK: đã viết lại & lưu.")

            except Exception as e:
                append_log({"id": pid, "title": "", "status": "FAIL", "note": str(e)[:200]})
                print(f"   -> LỖI: {e}")

            time.sleep(random.uniform(*DELAY_SECONDS))

        browser.close()
    print("Hoàn tất lô này. Xem chi tiết trong rewrite_log.csv")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--login", action="store_true", help="Đăng nhập & lưu phiên")
    group.add_argument("--run", action="store_true", help="Chạy tự động viết lại nội dung")
    parser.add_argument("--start", type=int, default=None, help="Vị trí bắt đầu trong product_ids.txt (1-indexed)")
    parser.add_argument("--end", type=int, default=None, help="Vị trí kết thúc trong product_ids.txt (bao gồm)")
    args = parser.parse_args()

    if args.login:
        do_login()
    elif args.run:
        do_run(args.start, args.end)
