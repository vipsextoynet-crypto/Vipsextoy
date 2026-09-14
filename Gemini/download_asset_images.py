"""
download_asset_images.py
===========================
Tải toàn bộ ảnh đang có trong Asset Manager (admin CMS) về thư mục
ai_images/ trên máy — dùng làm thư viện ảnh dự phòng cho
IMAGE_SOURCE_MODE="local_library" trong auto_post_blog.py.

Dùng chung session đăng nhập (state.json) với các script khác, không
cần đăng nhập lại.

CÁCH DÙNG
---------
    python download_asset_images.py

Mặc định tải từ đúng URL bạn đang xem (thư mục "save"). Nếu asset
manager có NHIỀU THƯ MỤC khác cũng muốn tải, sửa ASSET_MANAGER_URLS
bên dưới, thêm mỗi thư mục 1 dòng URL.
"""

from pathlib import Path
from urllib.parse import urljoin

from playwright.sync_api import sync_playwright

STATE_FILE = Path(__file__).parent / "state.json"
OUTPUT_DIR = Path(__file__).parent / "ai_images"

# Danh sách URL asset manager muốn tải ảnh từ đó. Thêm dòng nếu có nhiều
# thư mục con khác cũng chứa ảnh muốn lấy.
ASSET_MANAGER_URLS = [
    "https://vipsextoy.net/asset_manager.php?editor_name=detail_mce&type=image&class=&curent_file=&alt=",
]


def download_from_page(page, context, url: str) -> int:
    print(f"Đang mở: {url}")
    page.goto(url, wait_until="networkidle", timeout=60000)

    # Lấy toàn bộ URL ảnh hiển thị trong danh sách file
    img_srcs = page.eval_on_selector_all(
        "img", "els => els.map(e => e.src).filter(s => s && !s.startsWith('data:'))"
    )
    img_srcs = sorted(set(img_srcs))
    print(f"  Tìm thấy {len(img_srcs)} ảnh trên trang.")

    OUTPUT_DIR.mkdir(exist_ok=True)
    count = 0
    for src in img_srcs:
        full_url = urljoin(url, src)
        filename = full_url.split("/")[-1].split("?")[0]
        if not filename or "." not in filename:
            continue
        dest = OUTPUT_DIR / filename
        if dest.exists():
            continue  # đã tải rồi, khỏi tải lại
        try:
            # dùng request context CÙNG session đăng nhập để tải được cả
            # ảnh cần quyền admin mới xem được (không phải ảnh public)
            resp = context.request.get(full_url, timeout=30000)
            if resp.ok:
                dest.write_bytes(resp.body())
                count += 1
                print(f"  -> Đã tải: {filename}")
            else:
                print(f"  -> Bỏ qua (status {resp.status}): {filename}")
        except Exception as e:
            print(f"  -> Lỗi tải {filename}: {e}")
    return count


def main():
    if not STATE_FILE.exists():
        print(f"KHÔNG tìm thấy {STATE_FILE} — cần session đăng nhập admin đã lưu trước đó.")
        return

    total = 0
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(storage_state=str(STATE_FILE))
        page = context.new_page()

        for url in ASSET_MANAGER_URLS:
            total += download_from_page(page, context, url)

        browser.close()

    print(f"\nHOÀN TẤT: đã tải {total} ảnh mới vào {OUTPUT_DIR}")
    print("Chạy 'dir ai_images' để xem danh sách, rồi chạy lại auto_post_blog.py bình thường.")


if __name__ == "__main__":
    main()
