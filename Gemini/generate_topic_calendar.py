"""
generate_topic_calendar.py
============================
Tạo lịch chủ đề blog N ngày, XEN KẼ THEO TUẦN:
  - Tuần lẻ (1, 3, 5...): thiên về SEO từ khóa sản phẩm/ngành hàng
    (traffic tìm kiếm trực tiếp, người dùng có ý định mua).
  - Tuần chẵn (2, 4, 6...): thiên về kiến thức/hướng dẫn cho khách
    (tăng E-E-A-T, dễ được AI trích dẫn, xây dựng lòng tin).

Kết quả: file topics_queue.csv để auto_post_blog.py đọc và đăng dần mỗi
ngày (script tự đánh dấu 'posted' sau khi đăng, không đăng trùng).

CHỈNH SỬA DANH MỤC BÊN DƯỚI cho khớp đúng ngành hàng/danh mục thật của
bạn (lấy từ cây danh mục trong admin > Sản phẩm > Danh mục).
"""

import csv
import random
from datetime import date, timedelta
from pathlib import Path

OUTPUT_FILE = Path(__file__).parent / "topics_queue.csv"
NUM_DAYS = 60          # số ngày muốn tạo trước (có thể chạy lại để nối thêm)
START_DATE = date.today() + timedelta(days=1)  # bắt đầu từ ngày mai

# Danh mục / chủ đề chính của shop — chỉnh lại theo cây danh mục thật
CATEGORIES = [
    "Sextoy cho Nam", "Sextoy cho Nữ", "Trứng Rung", "Máy Massage",
    "Sextoy Cao Cấp", "Sextoy Cho LGBT", "Tăng Cường Sinh Lý",
    "Gel Bôi Trơn", "Bao Cao Su", "Nước Hoa",
]

# Khung chủ đề SEO từ khóa (tuần lẻ) — mẫu câu, sẽ tự chèn tên danh mục
SEO_KEYWORD_PATTERNS = [
    "Top 5 {cat} bán chạy nhất hiện nay, nên chọn loại nào?",
    "{cat} loại nào tốt cho người mới bắt đầu?",
    "So sánh các dòng {cat} phổ biến: ưu nhược điểm từng loại",
    "Giá {cat} bao nhiêu là hợp lý? Bảng giá tham khảo 2026",
    "Mua {cat} ở đâu uy tín, giao hàng kín đáo tại Việt Nam?",
    "{cat} chính hãng và hàng trôi nổi: cách phân biệt",
]

# Khung chủ đề hướng dẫn / EEAT (tuần chẵn)
GUIDE_EEAT_PATTERNS = [
    "Hướng dẫn vệ sinh và bảo quản {cat} đúng cách, dùng được lâu",
    "Những lưu ý an toàn khi sử dụng {cat} lần đầu",
    "Giải đáp thắc mắc thường gặp về {cat} (FAQ từ khách hàng)",
    "{cat} có ảnh hưởng đến sức khỏe không? Góc nhìn từ chuyên gia",
    "Cách chọn size/loại {cat} phù hợp với cơ địa từng người",
    "Chính sách bảo mật đơn hàng khi mua {cat} online — bạn cần biết gì?",
]


def week_type_for_day(day_index_zero_based: int) -> str:
    """Tuần 1,3,5... (index 0,2,4 theo tuần) = SEO; tuần 2,4,6... = GUIDE."""
    week_number = (day_index_zero_based // 7) + 1
    return "SEO" if week_number % 2 == 1 else "GUIDE"


def build_topic(week_type: str, used: set) -> tuple[str, str]:
    """Sinh 1 chủ đề chưa dùng, trả về (topic, category)."""
    patterns = SEO_KEYWORD_PATTERNS if week_type == "SEO" else GUIDE_EEAT_PATTERNS
    for _ in range(200):
        cat = random.choice(CATEGORIES)
        pattern = random.choice(patterns)
        topic = pattern.format(cat=cat)
        if topic not in used:
            used.add(topic)
            return topic, cat
    # hết ý tưởng chưa dùng -> vẫn trả về (chấp nhận trùng nhẹ) để không kẹt vòng lặp
    cat = random.choice(CATEGORIES)
    pattern = random.choice(patterns)
    return pattern.format(cat=cat), cat


def main():
    rows = []
    used_topics = set()

    # Nếu đã có file cũ, đọc lại để không tạo trùng ngày / trùng chủ đề
    if OUTPUT_FILE.exists():
        with open(OUTPUT_FILE, newline="", encoding="utf-8") as f:
            for r in csv.DictReader(f):
                rows.append(r)
                used_topics.add(r["topic"])
        last_date = date.fromisoformat(rows[-1]["date"]) if rows else START_DATE - timedelta(days=1)
        start = last_date + timedelta(days=1)
    else:
        start = START_DATE

    for i in range(NUM_DAYS):
        d = start + timedelta(days=i)
        week_type = week_type_for_day((d - START_DATE).days)
        topic, cat = build_topic(week_type, used_topics)
        rows.append({
            "date": d.isoformat(),
            "week_type": week_type,
            "category": cat,
            "topic": topic,
            "status": "PENDING",  # auto_post_blog.py sẽ đổi thành POSTED sau khi đăng
            "post_id": "",
            "url": "",
        })

    with open(OUTPUT_FILE, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["date", "week_type", "category", "topic", "status", "post_id", "url"])
        writer.writeheader()
        writer.writerows(rows)

    print(f"Đã tạo {len(rows)} chủ đề trong {OUTPUT_FILE}")
    print("Bạn có thể mở file này để sửa/thêm/xoá chủ đề bằng tay trước khi đăng.")


if __name__ == "__main__":
    main()
