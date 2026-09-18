# -*- coding: utf-8 -*-
"""
VIPSEXTOY PRODUCT IMAGE DOWNLOADER — stability-first crawler.

Thiết kế ưu tiên: STABILITY > SPEED.

- Không bypass, không né, không phá cơ chế bảo vệ của website.
- Người dùng tự mở khóa website bằng tay (nhập mã, bấm "Đồng ý").
- Crawler chạy TUẦN TỰ (không ThreadPoolExecutor), có delay ngẫu nhiên,
  batch cooldown, phát hiện "Vui lòng refresh" / rate-limit, exponential
  backoff, checkpoint/resume, và session health check.
"""

import os
import re
import time
import random
import hashlib
from datetime import datetime
from urllib.parse import urljoin, urlparse, urldefrag

import requests
from bs4 import BeautifulSoup


# ============================================================
# CONFIG
# ============================================================

BASE_URL = "https://vipsextoy.net"
BASE_HOST = urlparse(BASE_URL).netloc.lower()

OUTPUT_DIR = r"G:\vipextoy\public\anh1"
STATE_DIR = os.path.join(OUTPUT_DIR, "_state")
DEBUG_DIR = os.path.join(OUTPUT_DIR, "_debug")
BROWSER_PROFILE_DIR = os.path.join(OUTPUT_DIR, "_chrome_profile")

SAVE_DEBUG_HTML = True

# ---- Delay design (tất cả tập trung ở đây để dễ chỉnh) ------

MIN_REQUEST_DELAY = 2.0     # delay ngẫu nhiên trước mỗi request() (requests lib)
MAX_REQUEST_DELAY = 5.0

PAGE_DELAY = 3.0            # delay sau mỗi page navigation (Playwright)
PRODUCT_DELAY = 4.0         # delay sau khi xử lý xong 1 product
IMAGE_DELAY = 1.5           # delay sau mỗi ảnh tải xong

BATCH_SIZE = 15             # sau mỗi N URL/product thì nghỉ dài hơn
BATCH_COOLDOWN_MIN = 15.0
BATCH_COOLDOWN_MAX = 30.0

REFRESH_COOLDOWN = 15.0     # tối thiểu giữa 2 lần refresh liên tiếp

# Exponential backoff khi gặp "Vui lòng refresh" / rate limit.
BACKOFF_STEPS = [30, 60, 120, 240]
MAX_BACKOFF = 300
MAX_TEMP_ERROR_RETRIES = len(BACKOFF_STEPS) + 1  # bước cuối dùng MAX_BACKOFF

SESSION_HEALTH_CHECK_EVERY = 20  # kiểm tra lại session mỗi N URL đã crawl

# Nếu bạn đã tự nạp sẵn danh sách đầy đủ vào _state/product_urls.txt (ví dụ
# từ sitemap.xml tải thủ công), đặt True để BỎ QUA bước crawl toàn site và
# đi thẳng vào tải ảnh — tiết kiệm thời gian, giảm tải cho website.
# Đặt False nếu muốn crawler tự khám phá lại từ đầu (sitemap + BFS) mỗi lần chạy.
SKIP_CRAWL_IF_PRODUCTS_SEEDED = True

# ---- Concurrency ---------------------------------------------
#
# MAX_WORKERS = 1: crawler chạy TUẦN TỰ, không dùng ThreadPoolExecutor.
# Lý do: website đang báo "Vui lòng refresh" vì bị request/navigation dồn
# dập. Chạy song song (kể cả 2 luồng) sẽ nhân đôi tải lên website đúng lúc
# nó đang nhạy cảm nhất. Ưu tiên của crawler này là KHÔNG làm quá tải
# website, không phải tốc độ, nên không có lý do để thêm concurrency.
MAX_WORKERS = 1

TIMEOUT = 30
MAX_RETRIES = 3            # retry nhẹ cho lỗi mạng thông thường (không phải rate-limit)
MAX_URLS = 200000

BROWSER_TIMEOUT_MS = 30000
UNLOCK_STABILIZE_MIN = 5.0   # chờ sau khi unlock thành công
UNLOCK_STABILIZE_MAX = 10.0
POST_SYNC_WAIT = 5.0         # chờ thêm sau khi test homepage trước khi crawl


# ============================================================
# LOGGING
# ============================================================

def log(tag, message=""):
    ts = datetime.now().strftime("%H:%M:%S")
    if message:
        print(f"[{ts}] [{tag}] {message}")
    else:
        print(f"[{ts}] [{tag}]")


# ============================================================
# SESSION
# ============================================================

session = requests.Session()
session.headers.update({
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/139.0.0.0 Safari/537.36"
    ),
    "Accept": (
        "text/html,application/xhtml+xml,application/xml;"
        "q=0.9,image/avif,image/webp,*/*;q=0.8"
    ),
    "Accept-Language": "vi-VN,vi;q=0.9,en;q=0.8",
    "Connection": "keep-alive",
    "Referer": BASE_URL,
})


# ============================================================
# GLOBAL STATE (in-memory)
# ============================================================

visited_urls = set()
product_urls = set()
failed_urls = set()
downloaded_products = set()   # product codes đã tải xong hoàn toàn

downloaded = 0
skipped = 0
failed = 0

_browser = None
_browser_context = None
_browser_page = None
_playwright = None

SITE_UNLOCKED = False

_last_request_ts = 0.0
_last_refresh_ts = 0.0
_pages_since_health_check = 0


# ============================================================
# STATE FILES (checkpoint / resume)
# ============================================================

STATE_FILES = {
    "visited": "visited_urls.txt",
    "products": "product_urls.txt",
    "failed": "failed_urls.txt",
    "downloaded": "downloaded_products.txt",
}


def _state_path(name):
    return os.path.join(STATE_DIR, STATE_FILES[name])


def load_state():
    os.makedirs(STATE_DIR, exist_ok=True)

    def read_lines(name):
        path = _state_path(name)
        if not os.path.exists(path):
            return set()
        with open(path, "r", encoding="utf-8") as f:
            return {line.strip() for line in f if line.strip()}

    visited_urls.update(read_lines("visited"))
    product_urls.update(read_lines("products"))
    failed_urls.update(read_lines("failed"))
    downloaded_products.update(read_lines("downloaded"))

    if visited_urls or product_urls or downloaded_products:
        log("CHECKPOINT", (
            f"Đã nạp state cũ: visited={len(visited_urls)} "
            f"product={len(product_urls)} "
            f"downloaded_products={len(downloaded_products)} "
            f"failed={len(failed_urls)}"
        ))


def append_state(name, value):
    """Ghi 1 dòng vào state file ngay lập tức (checkpoint)."""
    os.makedirs(STATE_DIR, exist_ok=True)
    path = _state_path(name)
    try:
        with open(path, "a", encoding="utf-8") as f:
            f.write(value + "\n")
    except Exception as e:
        log("CHECKPOINT ERROR", f"{name}: {e}")


def mark_visited(url):
    if url not in visited_urls:
        visited_urls.add(url)
        append_state("visited", url)


def mark_product(url):
    if url not in product_urls:
        product_urls.add(url)
        append_state("products", url)


def mark_failed(url, reason=""):
    key = f"{url}\t{reason}" if reason else url
    if url not in failed_urls:
        failed_urls.add(url)
        append_state("failed", key)


def mark_product_downloaded(code):
    if code not in downloaded_products:
        downloaded_products.add(code)
        append_state("downloaded", code)


# ============================================================
# DELAY HELPERS
# ============================================================

def sleep_with_log(seconds, tag="WAIT"):
    log(tag, f"sleeping {seconds:.1f} seconds")
    time.sleep(seconds)


def random_delay(min_s, max_s, tag="WAIT"):
    seconds = random.uniform(min_s, max_s)
    sleep_with_log(seconds, tag)


def throttle_request():
    """Đảm bảo khoảng cách tối thiểu giữa các request() liên tiếp."""
    global _last_request_ts

    delay = random.uniform(MIN_REQUEST_DELAY, MAX_REQUEST_DELAY)
    elapsed = time.time() - _last_request_ts
    remaining = delay - elapsed

    if remaining > 0:
        time.sleep(remaining)

    _last_request_ts = time.time()


def batch_cooldown(count):
    """Gọi sau mỗi BATCH_SIZE item để nghỉ dài hơn."""
    if count > 0 and count % BATCH_SIZE == 0:
        random_delay(BATCH_COOLDOWN_MIN, BATCH_COOLDOWN_MAX, tag="BATCH COOLDOWN")


# ============================================================
# URL UTILS
# ============================================================

def normalize_url(url):
    if not url:
        return None

    url = url.strip()

    if url.startswith("//"):
        url = "https:" + url

    if not url.startswith(("http://", "https://")):
        return None

    url, _ = urldefrag(url)
    parsed = urlparse(url)

    if not parsed.scheme or not parsed.netloc:
        return None

    return parsed._replace(
        scheme=parsed.scheme.lower(),
        netloc=parsed.netloc.lower(),
    ).geturl()


def same_domain(url):
    try:
        host = urlparse(url).netloc.lower()
        return host == BASE_HOST or host.endswith("." + BASE_HOST)
    except Exception:
        return False


# ============================================================
# LOCK PAGE DETECTION (không tự điền mã — chỉ để phát hiện)
# ============================================================

def is_lock_page_html(html):
    if not html:
        return False

    try:
        soup = BeautifulSoup(html, "html.parser")
        text = soup.get_text(" ", strip=True).lower()

        password_input = soup.select_one('input[name="matkhau"]')

        lock_phrase = (
            "nhập mã sau để vào website" in text
            or "nhap ma sau de vao website" in text
        )

        if password_input and lock_phrase:
            return True

        if password_input:
            if (
                "tạm ngưng" in text
                or "tam ngung" in text
                or "hoàn tất thủ tục" in text
                or "hoan tat thu tuc" in text
            ):
                return True

    except Exception:
        pass

    return False


def page_is_unlocked(page):
    try:
        html = page.content()

        if is_lock_page_html(html):
            return False

        soup = BeautifulSoup(html, "html.parser")

        if soup.select_one('input[name="matkhau"]'):
            text = soup.get_text(" ", strip=True).lower()
            if (
                "nhập mã" in text
                or "nhap ma" in text
                or "tạm ngưng" in text
                or "tam ngung" in text
            ):
                return False

        links = soup.find_all("a", href=True)
        if len(links) >= 2:
            return True

        if soup.select_one("#anh_chitiet_sanpham") or soup.select_one(".html201.dtct"):
            return True

        if not soup.select_one('input[name="matkhau"]'):
            return True

    except Exception:
        pass

    return False


# ============================================================
# TEMPORARY ERROR / RATE LIMIT DETECTION
# ============================================================

# Cụm từ ĐẶC HIỆU: gần như chỉ xuất hiện trên trang lỗi tạm thời thật sự,
# không xuất hiện tình cờ trong nội dung bài viết bình thường.
# -> Trigger bất kể độ dài trang.
_TEMP_ERROR_PHRASES_STRONG = [
    "vui lòng refresh",
    "vui long refresh",
    "please refresh",
    "refresh trang",
    "too many requests",
    "temporarily unavailable",
    "tạm thời không khả dụng",
    "tam thoi khong kha dung",
]

# Cụm từ CHUNG CHUNG: các từ như "tạm thời", "đang tải", "quá tải" hoàn toàn
# có thể xuất hiện tự nhiên trong một bài viết blog bình thường (vd: "hiệu
# ứng tạm thời", "giải pháp tạm thời"...). Chỉ coi là lỗi thật khi trang có
# RẤT ÍT nội dung (giống trang lỗi/trang khóa thực tế chỉ vài trăm ký tự),
# để tránh false positive trên các trang nội dung dài (blog, bài viết).
_TEMP_ERROR_PHRASES_WEAK = [
    "tạm thời",
    "tam thoi",
    "đang tải",
    "dang tai",
    "quá tải",
    "qua tai",
]

_SHORT_PAGE_TEXT_THRESHOLD = 600  # ký tự — trang lỗi thật thường rất ngắn


def is_temporary_error_page(html):
    """
    Phát hiện trang lỗi tạm thời kiểu "Vui lòng refresh".
    Đây KHÔNG phải trang khóa (lock page) — là dấu hiệu website
    đang chống tải/crawl vì tốc độ request cao.
    """
    if not html:
        return False

    try:
        soup = BeautifulSoup(html, "html.parser")
        text = soup.get_text(" ", strip=True).lower()
    except Exception:
        text = html.lower()

    for phrase in _TEMP_ERROR_PHRASES_STRONG:
        if phrase in text:
            return True

    if len(text) <= _SHORT_PAGE_TEXT_THRESHOLD:
        for phrase in _TEMP_ERROR_PHRASES_WEAK:
            if phrase in text:
                return True

    return False


def is_rate_limited(response):
    """Kiểm tra response HTTP có dấu hiệu bị rate-limit không."""
    if response is None:
        return True  # không có response coi như lỗi cần backoff nhẹ

    if response.status_code in (429, 503, 502, 504):
        return True

    return False


def is_connection_style_error(exc):
    text = str(exc).lower()
    return any(
        keyword in text
        for keyword in ("timeout", "connection reset", "navigation timeout", "econnreset")
    )


def backoff_seconds(attempt):
    """attempt bắt đầu từ 1."""
    if attempt - 1 < len(BACKOFF_STEPS):
        return BACKOFF_STEPS[attempt - 1]
    return MAX_BACKOFF


# ============================================================
# PLAYWRIGHT / CHROME
# ============================================================

def close_browser():
    global _browser, _browser_context, _browser_page, _playwright

    for obj, closer in (
        (_browser_page, lambda o: o.close()),
        (_browser_context, lambda o: o.close()),
        (_browser, lambda o: o.close()),
        (_playwright, lambda o: o.stop()),
    ):
        try:
            if obj:
                closer(obj)
        except Exception:
            pass

    _browser = None
    _browser_context = None
    _browser_page = None
    _playwright = None


def ensure_browser():
    """Mở Chrome có giao diện, dùng persistent profile để giữ session."""
    global _browser, _browser_context, _browser_page, _playwright

    if _browser_page:
        return _browser_page

    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        log("PLAYWRIGHT MISSING", "pip install playwright && playwright install chromium")
        return None

    try:
        _playwright = sync_playwright().start()
        os.makedirs(BROWSER_PROFILE_DIR, exist_ok=True)

        log("CHROME", "Đang mở Chrome...")
        log("PROFILE", BROWSER_PROFILE_DIR)

        launch_kwargs = dict(
            user_data_dir=BROWSER_PROFILE_DIR,
            headless=False,
            viewport={"width": 1366, "height": 900},
            locale="vi-VN",
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/139.0.0.0 Safari/537.36"
            ),
            args=[
                "--disable-blink-features=AutomationControlled",
                "--disable-dev-shm-usage",
                "--no-sandbox",
            ],
        )

        try:
            _browser_context = _playwright.chromium.launch_persistent_context(
                channel="chrome", **launch_kwargs
            )
        except Exception as chrome_error:
            log("CHROME", "Không mở được Chrome system, dùng Chromium của Playwright.")
            log("CHROME ERROR", str(chrome_error))
            _browser_context = _playwright.chromium.launch_persistent_context(**launch_kwargs)

        pages = _browser_context.pages
        _browser_page = pages[0] if pages else _browser_context.new_page()
        _browser_page.set_default_timeout(BROWSER_TIMEOUT_MS)

        return _browser_page

    except Exception as e:
        log("BROWSER ERROR", str(e))
        return None


# ============================================================
# COOKIE SYNC
# ============================================================

def sync_browser_cookies_to_requests():
    if not _browser_context:
        return

    try:
        cookies = _browser_context.cookies()
        session.cookies.clear()

        count = 0
        for cookie in cookies:
            try:
                session.cookies.set(
                    cookie["name"],
                    cookie["value"],
                    domain=cookie.get("domain"),
                    path=cookie.get("path", "/"),
                )
                count += 1
            except Exception:
                pass

        log("COOKIE", f"Đã đồng bộ {count} cookie từ Chrome -> requests.")

    except Exception as e:
        log("COOKIE ERROR", str(e))


# ============================================================
# MANUAL UNLOCK
# ============================================================

def wait_for_manual_unlock():
    """Mở website và CHỜ NGƯỜI DÙNG nhập mã bằng tay. Không tự điền gì."""
    global SITE_UNLOCKED

    page = ensure_browser()
    if not page:
        return False

    log("LOGIN", "Mở website để nhập mã thủ công.")

    try:
        page.goto(BASE_URL, wait_until="domcontentloaded", timeout=BROWSER_TIMEOUT_MS)
    except Exception as e:
        log("WARNING", f"goto: {e}")

    time.sleep(2)

    if page_is_unlocked(page):
        log("UNLOCKED", "Website đã mở sẵn (profile cũ còn session). Không cần nhập mã.")
    else:
        print()
        print("=" * 75)
        print("WEBSITE ĐANG KHÓA")
        print("=" * 75)
        print("Chrome đã mở.")
        print("Hãy nhập mã và bấm Đồng ý.")
        print("Crawler đang chờ...")
        print("KHÔNG cần nhập gì ở terminal.")
        print("=" * 75)

        while True:
            try:
                if page_is_unlocked(page):
                    break
            except Exception as e:
                log("WAIT ERROR", str(e))
            time.sleep(1)

        log("UNLOCKED", "Website đã được mở.")

    # Chờ session/cookie ổn định trước khi làm gì tiếp.
    random_delay(UNLOCK_STABILIZE_MIN, UNLOCK_STABILIZE_MAX, tag="WAIT")

    sync_browser_cookies_to_requests()

    # Kiểm tra lại session bằng một request chậm.
    throttle_request()
    try:
        test = session.get(BASE_URL, timeout=TIMEOUT)
    except Exception as e:
        log("SESSION CHECK ERROR", str(e))
        test = None

    if test is not None and not is_lock_page_html(test.text):
        log("COOKIE", "Requests đã nhận session hợp lệ.")
    else:
        log("WARNING", "Requests chưa nhận được session hợp lệ sau unlock.")
        log("STOP", "Không tiếp tục crawl vì session chưa xác nhận được.")
        return False

    sleep_with_log(POST_SYNC_WAIT, tag="WAIT")

    SITE_UNLOCKED = True
    return True


# ============================================================
# SESSION HEALTH CHECK
# ============================================================

def check_session():
    """
    Kiểm tra homepage định kỳ. Nếu phát hiện lock page / session hỏng /
    "Vui lòng refresh" liên tục thì dừng crawl và yêu cầu người dùng
    kiểm tra Chrome (không tự ý tiếp tục crawl).
    """
    log("CHECK", "Kiểm tra session định kỳ...")

    throttle_request()
    try:
        response = session.get(BASE_URL, timeout=TIMEOUT)
        html = response.text
    except Exception as e:
        log("CHECK ERROR", str(e))
        html = None

    if html is None or is_lock_page_html(html):
        log("SESSION", "Session có vấn đề (lock page). Chrome đang mở, vui lòng kiểm tra.")
        return False

    if is_temporary_error_page(html):
        log("SESSION", "Homepage đang trả lỗi tạm thời ('Vui lòng refresh').")
        return False

    log("CHECK", "Session OK.")
    return True


# ============================================================
# REQUESTS-LEVEL FETCH (với retry nhẹ, KHÔNG spam)
# ============================================================

def request(url, stream=False, allow_lock_check=True):
    """
    GET qua requests.Session, có:
    - throttle (random delay 2-5s) trước mỗi lần gửi
    - retry nhẹ cho lỗi mạng thông thường (không phải rate-limit)
    - phát hiện rate-limit / trang khóa, KHÔNG tự động spam retry
    """
    for attempt in range(1, MAX_RETRIES + 1):
        throttle_request()

        try:
            response = session.get(
                url, timeout=TIMEOUT, stream=stream, allow_redirects=True
            )

            if is_rate_limited(response):
                log("RATE LIMIT", f"HTTP {response.status_code} — {url}")
                return response  # trả về để caller quyết định backoff

            if response.status_code == 200:
                if allow_lock_check and not stream and is_lock_page_html(response.text):
                    log("LOCK PAGE", url)
                return response

            log("HTTP", f"{response.status_code} {url}")
            return response

        except Exception as e:
            log("RETRY", f"{attempt}/{MAX_RETRIES} {url} ({e})")

            if attempt == MAX_RETRIES:
                log("ERROR", str(e))
                return None

            # Backoff nhẹ cho lỗi mạng (không phải rate-limit toàn trang).
            time.sleep(attempt * 2)

    return None


# ============================================================
# TEMPORARY-ERROR HANDLING (refresh + backoff, KHÔNG spam refresh)
# ============================================================

def handle_temporary_error_via_browser(page, url):
    """
    Xử lý "Vui lòng refresh" khi phát hiện qua Playwright.
    Trả về True nếu sau đó trang đã bình thường, False nếu bỏ cuộc.
    """
    global _last_refresh_ts

    for attempt in range(1, MAX_TEMP_ERROR_RETRIES + 1):
        wait_s = 10 + random.uniform(0, 10)  # chờ 10-20 giây trước khi refresh
        log("WAIT", f"phát hiện lỗi tạm thời tại {url}, chờ {wait_s:.1f}s trước khi refresh")
        time.sleep(wait_s)

        # Đảm bảo cooldown giữa 2 lần refresh.
        elapsed = time.time() - _last_refresh_ts
        if elapsed < REFRESH_COOLDOWN:
            sleep_with_log(REFRESH_COOLDOWN - elapsed, tag="WAIT")

        log("RETRY", f"refresh lần {attempt}/{MAX_TEMP_ERROR_RETRIES} — {url}")

        try:
            page.reload(wait_until="domcontentloaded", timeout=BROWSER_TIMEOUT_MS)
            _last_refresh_ts = time.time()
        except Exception as e:
            log("RETRY ERROR", str(e))
            _last_refresh_ts = time.time()

        time.sleep(random.uniform(5, 10))

        html = page.content()

        if is_lock_page_html(html):
            log("SESSION", "Website yêu cầu nhập mã lại. Vui lòng kiểm tra Chrome.")
            # Chờ người dùng mở khóa lại thủ công.
            while is_lock_page_html(page.content()):
                time.sleep(1)
            sync_browser_cookies_to_requests()
            html = page.content()

        if not is_temporary_error_page(html):
            log("RETRY", "Trang đã trở lại bình thường.")
            return True

        backoff = backoff_seconds(attempt)
        log("BACKOFF", f"vẫn lỗi, chờ {backoff}s trước khi thử lại")
        time.sleep(backoff)

    log("FAILED", f"Bỏ qua sau {MAX_TEMP_ERROR_RETRIES} lần thử: {url}")
    mark_failed(url, "temporary_error_exhausted")
    return False


# ============================================================
# BROWSER HTML
# ============================================================

def get_browser_html(url):
    global _pages_since_health_check

    page = ensure_browser()
    if not page:
        return None

    log("CRAWL", f"[browser] {url}")

    try:
        page.goto(url, wait_until="domcontentloaded", timeout=BROWSER_TIMEOUT_MS)
    except Exception as e:
        if is_connection_style_error(e):
            log("RETRY", f"navigation timeout — {url} ({e})")
        else:
            log("WARNING", f"goto: {e}")

    # Delay cố định + jitter sau mỗi navigation.
    # Không ép networkidle lâu (website có analytics chạy nền liên tục).
    time.sleep(PAGE_DELAY + random.uniform(0, 1.5))

    try:
        html = page.content()
    except Exception as e:
        log("BROWSER ERROR", f"{url} ({e})")
        return None

    if is_lock_page_html(html):
        log("SESSION", "Website lại yêu cầu mã. Vui lòng nhập thủ công trên Chrome.")
        while is_lock_page_html(page.content()):
            time.sleep(1)
        sync_browser_cookies_to_requests()
        html = page.content()

    elif is_temporary_error_page(html):
        ok = handle_temporary_error_via_browser(page, url)
        if not ok:
            return None
        html = page.content()

    if SAVE_DEBUG_HTML:
        save_debug_page(url, html)

    _pages_since_health_check += 1
    if _pages_since_health_check >= SESSION_HEALTH_CHECK_EVERY:
        _pages_since_health_check = 0
        if not check_session():
            log("STOP", "Dừng crawl để tránh làm quá tải website. Kiểm tra Chrome rồi chạy lại.")
            raise SystemExit(1)

    return html


# ============================================================
# DEBUG HTML
# ============================================================

def save_debug_page(url, html):
    if not SAVE_DEBUG_HTML or not html:
        return

    try:
        os.makedirs(DEBUG_DIR, exist_ok=True)
        digest = hashlib.md5(url.encode("utf-8")).hexdigest()[:10]
        path = os.path.join(DEBUG_DIR, f"{digest}.html")

        with open(path, "w", encoding="utf-8", errors="ignore") as f:
            f.write(f"<!-- URL: {url} -->\n{html}")

    except Exception:
        pass


# ============================================================
# HTML VALIDATION
# ============================================================

def looks_like_real_html(html):
    if not html:
        return False

    if is_lock_page_html(html) or is_temporary_error_page(html):
        return False

    soup = BeautifulSoup(html, "html.parser")

    if soup.select_one("#anh_chitiet_sanpham") or soup.select_one(".html201.dtct"):
        return True

    links = soup.find_all("a", href=True)
    if len(links) >= 2:
        return True

    title = soup.title.get_text(" ", strip=True).lower() if soup.title else ""
    if title and title not in {"đang tải trang", "dang tai trang"}:
        return True

    return False


# ============================================================
# GET HTML (requests trước, Browser sau)
# ============================================================

def get_html(url):
    response = request(url)

    if response is not None and is_rate_limited(response):
        # Rate limit ở tầng requests -> dùng browser (đã có session thật)
        # thay vì spam retry bằng requests.
        log("RATE LIMIT", f"chuyển sang browser cho {url}")
        return get_browser_html(url)

    if response is not None:
        try:
            response.encoding = response.apparent_encoding or response.encoding
        except Exception:
            pass

        html = response.text

        if looks_like_real_html(html):
            return html

        if is_lock_page_html(html):
            log("REQUEST", "Website vẫn khóa -> dùng Browser/session.")
        elif is_temporary_error_page(html):
            log("REQUEST", "Lỗi tạm thời qua requests -> dùng Browser để refresh đúng cách.")
        else:
            title = ""
            try:
                soup = BeautifulSoup(html, "html.parser")
                if soup.title:
                    title = soup.title.get_text(" ", strip=True)
            except Exception:
                pass
            log("REQUEST SHELL", f"title={title!r} -> dùng browser")

    return get_browser_html(url)


# ============================================================
# CLEAN FILENAME
# ============================================================

def clean_filename(value):
    value = value.strip()
    value = re.sub(r'[<>:"/\\|?*]', "_", value)
    value = re.sub(r"\s+", "_", value)
    return value


# ============================================================
# PRODUCT CODE
# ============================================================

def extract_product_code(soup):
    text = soup.get_text(" ", strip=True)

    patterns = [
        r"Mã\s*số\s*[:：]\s*([A-Za-z0-9._-]+)",
        r"Mã\s*sản\s*phẩm\s*[:：]\s*([A-Za-z0-9._-]+)",
        r"Mã\s*SP\s*[:：]\s*([A-Za-z0-9._-]+)",
        r"SKU\s*[:：]\s*([A-Za-z0-9._-]+)",
    ]

    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            return clean_filename(match.group(1).strip())

    html = str(soup)

    for pattern in patterns:
        match = re.search(pattern, html, re.IGNORECASE)
        if match:
            return clean_filename(match.group(1).strip())

    match = re.search(r"(?:^|[/\\\"'])files/sanpham/(\d+)/", html, re.IGNORECASE)
    if match:
        return clean_filename(match.group(1))

    main_img = soup.select_one("#anh_chitiet_sanpham")
    if main_img:
        for attr in ("data-large", "src", "data-src", "data-original"):
            value = main_img.get(attr, "")
            match = re.search(r"(?:^|/)files/sanpham/(\d+)/", value, re.IGNORECASE)
            if match:
                return clean_filename(match.group(1))

    return None


# ============================================================
# PRODUCT DETECTION
# ============================================================

def is_product_page(soup):
    if not soup:
        return False
    if soup.select_one("#anh_chitiet_sanpham"):
        return True
    if soup.select_one(".html201.dtct"):
        return True
    return False


# ============================================================
# SAFE DISCOVERY URL
# ============================================================

def is_safe_discovery_url(url):
    if not url or not same_domain(url):
        return False

    parsed = urlparse(url)
    path = (parsed.path or "/").lower()
    host = parsed.netloc.lower()

    if "vimeo.com" in host or "player.vimeo.com" in host:
        return False

    if path.startswith(("/upload/", "/uploads/", "/media/", "/files/")):
        return False

    if path.endswith((
        ".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif", ".svg",
        ".mp4", ".webm", ".mov", ".avi", ".mkv", ".mp3", ".wav", ".ogg",
        ".css", ".js", ".json", ".xml", ".pdf", ".zip", ".rar", ".7z",
        ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
    )):
        return False

    fake_paths = {
        "/style", "/script", "/html", "/head", "/body",
        "/title", "/form", "/p", "/strong", "/span", "/div",
    }

    if path.rstrip("/") in fake_paths:
        return False

    return True


# ============================================================
# EXTRACT LINKS
# ============================================================

def extract_links(soup, current_url):
    links = set()

    def add(value):
        if not value:
            return

        value = value.strip()
        if value.startswith(("#", "javascript:", "mailto:", "tel:", "data:")):
            return

        url = normalize_url(urljoin(current_url, value))
        if url and is_safe_discovery_url(url):
            links.add(url)

    for a in soup.find_all("a", href=True):
        add(a.get("href"))

    canonical = soup.find("link", rel=lambda v: v and "canonical" in v)
    if canonical:
        add(canonical.get("href"))

    for link in soup.find_all("link", href=True):
        rel = link.get("rel") or []
        if any(str(x).lower() in {"next", "prev"} for x in rel):
            add(link.get("href"))

    return links


# ============================================================
# IMAGE URL
# ============================================================

def is_image_url(url):
    if not url or not same_domain(url):
        return False
    path = urlparse(url).path.lower()
    return path.endswith((".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif"))


def normalize_image_url(value, page_url):
    if not value:
        return None

    value = value.strip()
    if value.lower().startswith("data:"):
        return None

    if value.startswith("//"):
        value = "https:" + value

    if value.lower().startswith(("files/", "/files/")):
        value = "/" + value.lstrip("/")
        url = urljoin(BASE_URL, value)
    else:
        url = urljoin(page_url, value)

    url, _ = urldefrag(url)
    parsed = urlparse(url)
    url = parsed._replace(query="").geturl()

    if not same_domain(url) or not is_image_url(url):
        return None

    return url


# ============================================================
# PRODUCT IMAGES
# ============================================================

def extract_product_images(soup, page_url):
    candidates = []

    def add(value):
        url = normalize_image_url(value, page_url)
        if url:
            candidates.append(url)

    main = soup.select_one("#anh_chitiet_sanpham")
    if main:
        for attr in ("data-large", "data-original", "data-src", "src"):
            add(main.get(attr))

    gallery_selectors = [
        ".anh_chitiet_sanpham img", ".product-gallery img", ".product-detail img",
        ".detail-product img", ".gallery img", ".thumb img", ".thumbs img",
        ".sanpham img", ".hinh-san-pham img",
    ]

    for selector in gallery_selectors:
        for img in soup.select(selector):
            for attr in ("data-large", "data-original", "data-src", "src"):
                add(img.get(attr))

    for detail in soup.select(".html201.dtct, .dtct"):
        for img in detail.find_all("img"):
            for attr in ("data-large", "data-original", "data-src", "src"):
                add(img.get(attr))

    for detail in soup.select(".html201.dtct, .dtct"):
        for source in detail.find_all("source"):
            add(source.get("src"))
            add(source.get("data-src"))

    result = []
    seen = set()
    for url in candidates:
        if url not in seen:
            seen.add(url)
            result.append(url)

    return result


# ============================================================
# IMAGE EXTENSION
# ============================================================

def get_extension(url, content_type=""):
    path = urlparse(url).path.lower()

    for ext in (".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif"):
        if path.endswith(ext):
            return ext

    content_type = content_type.lower()
    for key, ext in (
        ("jpeg", ".jpg"), ("png", ".png"), ("webp", ".webp"),
        ("gif", ".gif"), ("avif", ".avif"),
    ):
        if key in content_type:
            return ext

    return ".jpg"


# ============================================================
# DOWNLOAD IMAGE
# ============================================================

def download_image(image_url, folder, index):
    global downloaded, skipped, failed

    os.makedirs(folder, exist_ok=True)

    # Kiểm tra file đã tồn tại trước — không cần request lại.
    existing = [
        f for f in os.listdir(folder)
        if f.startswith(f"{index:02d}.")
    ] if os.path.isdir(folder) else []

    if existing:
        skipped += 1
        log("IMAGE", f"skip (đã tồn tại) {existing[0]}")
        return True

    response = request(image_url, stream=True)

    if response is None or is_rate_limited(response):
        failed += 1
        mark_failed(image_url, "image_download_failed")
        return False

    if response.status_code != 200:
        failed += 1
        mark_failed(image_url, f"http_{response.status_code}")
        return False

    content_type = response.headers.get("Content-Type", "")

    if "text/html" in content_type.lower():
        log("ERROR", f"response là HTML, không phải ảnh: {image_url}")
        failed += 1
        mark_failed(image_url, "html_not_image")
        response.close()
        return False

    extension = get_extension(image_url, content_type)
    filepath = os.path.join(folder, f"{index:02d}{extension}")

    try:
        with open(filepath, "wb") as f:
            for chunk in response.iter_content(chunk_size=128 * 1024):
                if chunk:
                    f.write(chunk)
        response.close()

        if os.path.getsize(filepath) < 500:
            os.remove(filepath)
            failed += 1
            mark_failed(image_url, "file_too_small")
            return False

        downloaded += 1
        log("IMAGE", f"OK {os.path.basename(filepath)}")
        return True

    except Exception as e:
        log("ERROR", f"{image_url} ({e})")
        failed += 1
        mark_failed(image_url, "exception_on_write")

        if os.path.exists(filepath):
            try:
                os.remove(filepath)
            except Exception:
                pass

        return False


# ============================================================
# PROCESS PRODUCT
# ============================================================

def process_product(url):
    log("PRODUCT", url)

    html = get_html(url)
    if not html:
        log("SKIP", "Không lấy được HTML")
        mark_failed(url, "no_html")
        return False

    soup = BeautifulSoup(html, "html.parser")

    if not is_product_page(soup):
        log("SKIP", "HTML không có signature product")
        return False

    code = extract_product_code(soup)
    if not code:
        log("SKIP", "Không tìm thấy mã sản phẩm")
        mark_failed(url, "no_product_code")
        return False

    log("PRODUCT", f"code={code}")

    if code in downloaded_products:
        log("PRODUCT", f"code={code} đã tải trước đó — resume, bỏ qua.")
        return True

    folder = os.path.join(OUTPUT_DIR, code)
    images = extract_product_images(soup, url)

    log("PRODUCT", f"tìm thấy {len(images)} ảnh")

    if not images:
        log("PRODUCT", "không có ảnh")
        return False

    for index, image_url in enumerate(images, start=1):
        log("IMAGE", f"{index}/{len(images)} {image_url}")
        download_image(image_url, folder, index)
        sleep_with_log(IMAGE_DELAY, tag="WAIT")

    mark_product_downloaded(code)
    return True


# ============================================================
# SITEMAP XML
# ============================================================

def parse_sitemap_xml(sitemap_url, xml_text, found, visited_sitemaps=None):
    if visited_sitemaps is None:
        visited_sitemaps = set()

    if sitemap_url in visited_sitemaps:
        return

    visited_sitemaps.add(sitemap_url)

    locs = re.findall(r"<loc>\s*(.*?)\s*</loc>", xml_text, flags=re.IGNORECASE | re.DOTALL)

    for raw_loc in locs:
        loc = normalize_url(raw_loc.strip())
        if not loc or not same_domain(loc):
            continue

        path = urlparse(loc).path.lower()

        if path.endswith(".xml"):
            child = request(loc)
            if child and not is_rate_limited(child):
                parse_sitemap_xml(loc, child.text or "", found, visited_sitemaps)
            continue

        if is_safe_discovery_url(loc):
            found.add(loc)


def discover_sitemap_urls():
    candidates = [
        urljoin(BASE_URL, "robots.txt"),
        urljoin(BASE_URL, "sitemap.xml"),
        urljoin(BASE_URL, "sitemap_index.xml"),
    ]

    found = set()

    for sitemap_url in candidates:
        response = request(sitemap_url)
        if not response or is_rate_limited(response):
            continue

        text = response.text or ""
        sitemap_urls = []

        sitemap_urls.extend(re.findall(r"(?im)^\s*Sitemap:\s*(https?://[^\s]+)", text))

        if sitemap_url.endswith(".xml"):
            sitemap_urls.append(sitemap_url)

        for u in sitemap_urls:
            u = normalize_url(u)
            if not u or not same_domain(u):
                continue

            try:
                xml_response = response if u == sitemap_url else request(u)
                if not xml_response or is_rate_limited(xml_response):
                    continue

                parse_sitemap_xml(u, xml_response.text or "", found)

            except Exception as e:
                log("SITEMAP ERROR", f"{u}: {e}")

    return found


# ============================================================
# CRAWL (BFS tuần tự)
# ============================================================

def crawl():
    queue = []
    queued = set()

    def enqueue(url):
        url = normalize_url(url)
        if not url or url in queued or url in visited_urls or not is_safe_discovery_url(url):
            return
        if len(queued) >= MAX_URLS:
            return
        queued.add(url)
        queue.append(url)

    enqueue(BASE_URL)

    sitemap_urls = discover_sitemap_urls()
    for sitemap_url in sorted(sitemap_urls):
        enqueue(sitemap_url)

    if sitemap_urls:
        log("SITEMAP", f"discovered {len(sitemap_urls)} URLs")
    else:
        log("SITEMAP", "Không tìm thấy sitemap URL")

    processed_this_run = 0

    while queue:
        url = queue.pop(0)

        if url in visited_urls or len(visited_urls) >= MAX_URLS:
            continue

        log("CRAWL", f"[{len(visited_urls) + 1}] {url}")

        try:
            html = get_html(url)
        except SystemExit:
            raise
        except Exception as e:
            log("ERROR", f"{url} ({e})")
            mark_failed(url, "exception")
            mark_visited(url)
            continue

        if not html:
            mark_failed(url, "no_html")
            mark_visited(url)
            continue

        soup = BeautifulSoup(html, "html.parser")

        if is_product_page(soup):
            mark_product(url)
            log("PRODUCT FOUND", url)
            mark_visited(url)
            processed_this_run += 1
            batch_cooldown(processed_this_run)
            continue

        visible_links = len(soup.find_all("a", href=True))
        title = soup.title.get_text(" ", strip=True) if soup.title else ""
        log("PAGE", f"title={title!r} links={visible_links}")

        for link in extract_links(soup, url):
            enqueue(link)

        mark_visited(url)
        processed_this_run += 1

        # Delay giữa các page navigation (ngoài delay đã có trong get_html).
        sleep_with_log(random.uniform(0.5, 1.5), tag="WAIT")
        batch_cooldown(processed_this_run)

    log("DONE", f"URL đã crawl={len(visited_urls)} sản phẩm={len(product_urls)}")


# ============================================================
# SAVE PRODUCT LIST (tổng hợp, không phải checkpoint)
# ============================================================

def save_product_list():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    filepath = os.path.join(OUTPUT_DIR, "_product_urls.txt")

    with open(filepath, "w", encoding="utf-8") as f:
        for url in sorted(product_urls):
            f.write(url + "\n")

    log("SAVE", filepath)


# ============================================================
# DOWNLOAD ALL (tuần tự — không ThreadPoolExecutor)
# ============================================================

def download_all():
    log("DONE", f"Bắt đầu tải {len(product_urls)} sản phẩm (tuần tự, MAX_WORKERS={MAX_WORKERS})")

    if not product_urls:
        log("INFO", "Không có product URL để tải.")
        log("INFO", f"Xem HTML debug: {DEBUG_DIR}")
        return

    urls = sorted(product_urls)
    completed = 0

    for url in urls:
        completed += 1

        try:
            process_product(url)
        except SystemExit:
            raise
        except Exception as e:
            log("PRODUCT ERROR", f"{url} ({e})")
            mark_failed(url, "exception")

        log("PROGRESS", f"{completed}/{len(urls)}")

        sleep_with_log(PRODUCT_DELAY, tag="WAIT")
        batch_cooldown(completed)


# ============================================================
# MAIN
# ============================================================

def main():
    print()
    print("=" * 75)
    print("VIPSEXTOY PRODUCT IMAGE DOWNLOADER — stability-first")
    print("=" * 75)
    print(f"Website : {BASE_URL}")
    print(f"Output  : {OUTPUT_DIR}")
    print(f"State   : {STATE_DIR}")
    print(f"Chrome profile : {BROWSER_PROFILE_DIR}")
    print()

    os.makedirs(OUTPUT_DIR, exist_ok=True)
    load_state()

    try:
        if not wait_for_manual_unlock():
            log("STOP", "Không mở/xác nhận được session website.")
            return

        log("START", "Bắt đầu crawler.")

        if SKIP_CRAWL_IF_PRODUCTS_SEEDED and product_urls:
            log("CHECKPOINT", (
                f"Đã có sẵn {len(product_urls)} product URL từ _state/product_urls.txt "
                "-> bỏ qua bước crawl toàn site, đi thẳng vào tải ảnh."
            ))
        else:
            crawl()
            save_product_list()

        download_all()

    except KeyboardInterrupt:
        log("STOP", "Người dùng dừng crawler. Tiến trình đã được checkpoint, có thể chạy lại để resume.")

    except SystemExit:
        log("STOP", "Crawler dừng vì session không ổn định. Kiểm tra Chrome rồi chạy lại (sẽ resume).")

    except Exception as e:
        log("FATAL ERROR", str(e))

    finally:
        close_browser()

    print()
    print("=" * 75)
    print("HOÀN TẤT")
    print("=" * 75)
    print(f"URL crawl      : {len(visited_urls)}")
    print(f"Sản phẩm       : {len(product_urls)}")
    print(f"Sản phẩm đã tải hoàn chỉnh : {len(downloaded_products)}")
    print(f"Ảnh tải        : {downloaded}")
    print(f"Ảnh bỏ qua     : {skipped}")
    print(f"Ảnh lỗi        : {failed}")
    print(f"URL thất bại   : {len(failed_urls)} (xem {_state_path('failed')})")
    print(f"Folder         : {OUTPUT_DIR}")
    print()


if __name__ == "__main__":
    main()
