# -*- coding: utf-8 -*-
"""
VIPSEXTOY PRODUCT DETAIL TEXT DOWNLOADER — stability-first crawler.

Giống hệt triết lý của download_product.py (mở khóa thủ công, session
requests + Chrome/Playwright, chống rate-limit, checkpoint/resume, KHÔNG
concurrency) nhưng đổi mục tiêu: thay vì tải ẢNH, script này lấy NỘI DUNG
CHỮ trong khối "Chi tiết" của từng sản phẩm và ghi vào 1 file JSONL để
dùng ở bước sau (apply-product-details.mjs) đưa vào field longDescription
của src/data/products.ts.

TÁI SỬ DỤNG: nếu bạn đã chạy download_product.py trước đó, script này đọc
lại DANH SÁCH URL SẢN PHẨM đã có sẵn trong
  public/anh1/_state/product_urls.txt
để KHÔNG PHẢI crawl lại toàn site lần nữa (đỡ tải cho website). Nếu file
đó chưa có, script tự crawl từ đầu y hệt cách download_product.py làm.

CÁCH DÙNG
---------
  pip install requests beautifulsoup4 playwright
  playwright install chromium

  python scripts/download_product_details.py --dry-run --limit 5
      # thử với 5 sản phẩm đầu tiên, CHỈ IN RA MÀN HÌNH, không ghi file

  python scripts/download_product_details.py
      # chạy thật, ghi vào scripts/_details_state/product_details.jsonl
      # (Ctrl+C an toàn — chạy lại sẽ resume, không tải lại sản phẩm đã xong)

AN TOÀN VỚI WEBSITE: dùng lại nguyên delay/backoff/rate-limit-detect của
download_product.py — không tăng tốc, không chạy song song.

SAU KHI CHẠY XONG: dùng scripts/apply-product-details.mjs để đưa nội dung
đã lấy được vào src/data/products.ts.
"""

import os
import re
import time
import json
import random
from datetime import datetime
from urllib.parse import urljoin, urlparse, urldefrag

import requests
from bs4 import BeautifulSoup

# ============================================================
# CONFIG
# ============================================================

BASE_URL = "https://vipsextoy.net"
BASE_HOST = urlparse(BASE_URL).netloc.lower()

# Doc lai danh sach URL san pham DA CO SAN tu lan crawl anh truoc do (neu co)
# de khong phai crawl lai toan site.
IMAGES_STATE_DIR = r"G:\vipextoy\public\anh1\_state"
EXISTING_PRODUCT_URLS_FILE = os.path.join(IMAGES_STATE_DIR, "product_urls.txt")

# State/output RIENG cho script nay, khong dung chung voi state cua
# download_product.py (tranh lam lon du lieu resume cua no).
STATE_DIR = r"G:\vipextoy\scripts\_details_state"
DEBUG_DIR = os.path.join(STATE_DIR, "_debug")
BROWSER_PROFILE_DIR = os.path.join(STATE_DIR, "_chrome_profile")
OUTPUT_JSONL = os.path.join(STATE_DIR, "product_details.jsonl")

SAVE_DEBUG_HTML = True

# ---- Delay design (giong het download_product.py) -------------
MIN_REQUEST_DELAY = 2.0
MAX_REQUEST_DELAY = 5.0
PAGE_DELAY = 3.0
PRODUCT_DELAY = 4.0

BATCH_SIZE = 15
BATCH_COOLDOWN_MIN = 15.0
BATCH_COOLDOWN_MAX = 30.0

REFRESH_COOLDOWN = 15.0
BACKOFF_STEPS = [30, 60, 120, 240]
MAX_BACKOFF = 300
MAX_TEMP_ERROR_RETRIES = len(BACKOFF_STEPS) + 1

SESSION_HEALTH_CHECK_EVERY = 20

TIMEOUT = 30
MAX_RETRIES = 3
MAX_URLS = 200000

BROWSER_TIMEOUT_MS = 30000
UNLOCK_STABILIZE_MIN = 5.0
UNLOCK_STABILIZE_MAX = 10.0
POST_SYNC_WAIT = 5.0

# Khoi HTML chua noi dung "Chi tiet san pham" - thu lan luot tung selector
# nay, dung selector DAU TIEN khop. Neu chay thu ma khong ra dung noi dung,
# mo 1 trang san pham that, F12 xem khoi "Chi tiet" nam trong the nao roi
# them selector do vao DAU danh sach.
DETAIL_SELECTORS = [
    # QUAN TRONG: class ".giatri" bi dung CHUNG cho nhieu cho khac nhau tren
    # trang (vd 1 the nho chi chua ten san pham o dau trang). Neu chi tim
    # ".giatri" suong, select_one() se vo tinh vo nham cai DAU TIEN gap tren
    # trang (thuong la cai sai, chi co ten san pham). Phai gioi han ro no
    # nam BEN TRONG khoi "noidungchitiet dtct" (dung cau truc thuc te:
    # <div class="noidungchitiet dtct"><span class="giatri">...noi dung
    # day du...</span></div>) thi moi chac chan lay dung khoi "Chi tiet".
    ".noidungchitiet.dtct .giatri",
    ".noidungchitiet .giatri",
    ".html201.dtct",
    ".dtct",
    ".mota",               # chi co thong so ngan (Ten/Ma/Hang/Xuat xu) - dung
                           # khi san pham KHONG co khoi noidungchitiet day du
    ".product-description",
    ".product-desc",
    ".mo-ta-san-pham",
    # ".giatri" suong dung SAU CUNG (du phong), vi co the vo nham noi dung
    # sai o dau trang nhu mo ta o tren - chi dung khi khong con lua chon nao.
    ".giatri",
]


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
# SESSION (giong het download_product.py)
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

_last_request_ts = 0.0
_last_refresh_ts = 0.0
_pages_since_health_check = 0

_browser = None
_browser_context = None
_browser_page = None
_playwright = None


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
    global _last_request_ts
    delay = random.uniform(MIN_REQUEST_DELAY, MAX_REQUEST_DELAY)
    elapsed = time.time() - _last_request_ts
    remaining = delay - elapsed
    if remaining > 0:
        time.sleep(remaining)
    _last_request_ts = time.time()


def batch_cooldown(count):
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
    return parsed._replace(scheme=parsed.scheme.lower(), netloc=parsed.netloc.lower()).geturl()


def same_domain(url):
    try:
        host = urlparse(url).netloc.lower()
        return host == BASE_HOST or host.endswith("." + BASE_HOST)
    except Exception:
        return False


# ============================================================
# LOCK / TEMP-ERROR DETECTION (giong het download_product.py)
# ============================================================

def is_lock_page_html(html):
    if not html:
        return False
    try:
        soup = BeautifulSoup(html, "html.parser")
        text = soup.get_text(" ", strip=True).lower()
        password_input = soup.select_one('input[name="matkhau"]')
        lock_phrase = ("nhập mã sau để vào website" in text or "nhap ma sau de vao website" in text)
        if password_input and lock_phrase:
            return True
        if password_input:
            if ("tạm ngưng" in text or "tam ngung" in text or "hoàn tất thủ tục" in text or "hoan tat thu tuc" in text):
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
            if ("nhập mã" in text or "nhap ma" in text or "tạm ngưng" in text or "tam ngung" in text):
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


_TEMP_ERROR_PHRASES_STRONG = [
    "vui lòng refresh", "vui long refresh", "please refresh", "refresh trang",
    "too many requests", "temporarily unavailable",
    "tạm thời không khả dụng", "tam thoi khong kha dung",
]
_TEMP_ERROR_PHRASES_WEAK = ["tạm thời", "tam thoi", "đang tải", "dang tai", "quá tải", "qua tai"]
_SHORT_PAGE_TEXT_THRESHOLD = 600


def is_temporary_error_page(html):
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
    if response is None:
        return True
    if response.status_code in (429, 503, 502, 504):
        return True
    return False


def is_connection_style_error(exc):
    text = str(exc).lower()
    return any(k in text for k in ("timeout", "connection reset", "navigation timeout", "econnreset"))


def backoff_seconds(attempt):
    if attempt - 1 < len(BACKOFF_STEPS):
        return BACKOFF_STEPS[attempt - 1]
    return MAX_BACKOFF


# ============================================================
# PLAYWRIGHT / CHROME (giong het download_product.py)
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
    _browser = _browser_context = _browser_page = _playwright = None


def ensure_browser():
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
            args=["--disable-blink-features=AutomationControlled", "--disable-dev-shm-usage", "--no-sandbox"],
        )
        try:
            _browser_context = _playwright.chromium.launch_persistent_context(channel="chrome", **launch_kwargs)
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


def sync_browser_cookies_to_requests():
    if not _browser_context:
        return
    try:
        cookies = _browser_context.cookies()
        session.cookies.clear()
        count = 0
        for cookie in cookies:
            try:
                session.cookies.set(cookie["name"], cookie["value"], domain=cookie.get("domain"), path=cookie.get("path", "/"))
                count += 1
            except Exception:
                pass
        log("COOKIE", f"Đã đồng bộ {count} cookie từ Chrome -> requests.")
    except Exception as e:
        log("COOKIE ERROR", str(e))


def wait_for_manual_unlock():
    global _last_refresh_ts
    page = ensure_browser()
    if not page:
        return False
    log("LOGIN", "Mở website để nhập mã thủ công (giống hệt lúc tải ảnh).")
    try:
        page.goto(BASE_URL, wait_until="domcontentloaded", timeout=BROWSER_TIMEOUT_MS)
    except Exception as e:
        log("WARNING", f"goto: {e}")
    time.sleep(2)
    if page_is_unlocked(page):
        log("UNLOCKED", "Website đã mở sẵn (profile cũ còn session).")
    else:
        print()
        print("=" * 75)
        print("WEBSITE ĐANG KHÓA")
        print("=" * 75)
        print("Chrome đã mở. Hãy nhập mã và bấm Đồng ý.")
        print("Crawler đang chờ... KHÔNG cần nhập gì ở terminal.")
        print("=" * 75)
        while True:
            try:
                if page_is_unlocked(page):
                    break
            except Exception as e:
                log("WAIT ERROR", str(e))
            time.sleep(1)
        log("UNLOCKED", "Website đã được mở.")

    random_delay(UNLOCK_STABILIZE_MIN, UNLOCK_STABILIZE_MAX, tag="WAIT")
    sync_browser_cookies_to_requests()

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
        log("STOP", "Không tiếp tục vì session chưa xác nhận được.")
        return False

    sleep_with_log(POST_SYNC_WAIT, tag="WAIT")
    return True


def check_session():
    log("CHECK", "Kiểm tra session định kỳ...")
    throttle_request()
    try:
        response = session.get(BASE_URL, timeout=TIMEOUT)
        html = response.text
    except Exception as e:
        log("CHECK ERROR", str(e))
        html = None
    if html is None or is_lock_page_html(html):
        log("SESSION", "Session có vấn đề (lock page). Vui lòng kiểm tra Chrome.")
        return False
    if is_temporary_error_page(html):
        log("SESSION", "Homepage đang trả lỗi tạm thời ('Vui lòng refresh').")
        return False
    log("CHECK", "Session OK.")
    return True


# ============================================================
# FETCH HTML (requests truoc, Browser sau) - giong het download_product.py
# ============================================================

def request(url, stream=False):
    for attempt in range(1, MAX_RETRIES + 1):
        throttle_request()
        try:
            response = session.get(url, timeout=TIMEOUT, stream=stream, allow_redirects=True)
            if is_rate_limited(response):
                log("RATE LIMIT", f"HTTP {response.status_code} — {url}")
                return response
            return response
        except Exception as e:
            log("RETRY", f"{attempt}/{MAX_RETRIES} {url} ({e})")
            if attempt == MAX_RETRIES:
                log("ERROR", str(e))
                return None
            time.sleep(attempt * 2)
    return None


def handle_temporary_error_via_browser(page, url):
    global _last_refresh_ts
    for attempt in range(1, MAX_TEMP_ERROR_RETRIES + 1):
        wait_s = 10 + random.uniform(0, 10)
        log("WAIT", f"phát hiện lỗi tạm thời tại {url}, chờ {wait_s:.1f}s trước khi refresh")
        time.sleep(wait_s)
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
    return False


def save_debug_page(url, html):
    if not SAVE_DEBUG_HTML or not html:
        return
    try:
        import hashlib
        os.makedirs(DEBUG_DIR, exist_ok=True)
        digest = hashlib.md5(url.encode("utf-8")).hexdigest()[:10]
        path = os.path.join(DEBUG_DIR, f"{digest}.html")
        with open(path, "w", encoding="utf-8", errors="ignore") as f:
            f.write(f"<!-- URL: {url} -->\n{html}")
    except Exception:
        pass


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
            log("STOP", "Dừng để tránh làm quá tải website. Kiểm tra Chrome rồi chạy lại.")
            raise SystemExit(1)
    return html


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


def get_html(url):
    response = request(url)
    if response is not None and is_rate_limited(response):
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
            log("REQUEST", "Lỗi tạm thời qua requests -> dùng Browser.")
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
# PRODUCT DETECTION + CODE (giong het download_product.py)
# ============================================================

def is_product_page(soup):
    if not soup:
        return False
    if soup.select_one("#anh_chitiet_sanpham"):
        return True
    if soup.select_one(".html201.dtct"):
        return True
    return False


def clean_filename(value):
    value = value.strip()
    value = re.sub(r'[<>:"/\\|?*]', "_", value)
    value = re.sub(r"\s+", "_", value)
    return value


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
    return None


def extract_product_name(soup):
    h1 = soup.find("h1")
    if h1:
        t = h1.get_text(" ", strip=True)
        if t:
            return t
    if soup.title:
        return soup.title.get_text(" ", strip=True)
    return None


# ============================================================
# TRICH XUAT NOI DUNG "CHI TIET" (phan moi so voi download_product.py)
# ============================================================

# The BLOCK duoc coi la "ranh gioi dong/doan van". Van ban INLINE (strong,
# a, span, text thuong...) trong CUNG 1 the block se duoc gop lien mach
# thanh 1 dong duy nhat (khong bi tach vo ly giua "<strong>Nhan:</strong> mo
# ta" thanh 2 dong) - chi khi GAP mot the block MOI thi moi xuong dong.
_BLOCK_LEVEL_TAGS = {
    "p", "div", "h1", "h2", "h3", "h4", "h5", "h6",
    "ul", "ol", "li", "tr", "table", "section", "article",
    "blockquote", "pre",
}


def _flatten_leaf_lines(node):
    """The KHONG chua the block nao ben trong -> lay text INLINE cua no
    thanh 1 (hoac vai, neu con dong moi do <br> de lai) dong, khong chen
    them khoang trang gia tao giua cac the con (<strong>, <a>...)."""
    text = node.get_text().replace(chr(13), "")
    parts = [re.sub(r"[ \t]+", " ", ln).strip() for ln in text.split(chr(10))]
    return [p for p in parts if p]


def _extract_lines(node):
    from bs4 import NavigableString, Tag

    if isinstance(node, NavigableString):
        t = re.sub(r"[ \t]+", " ", str(node)).strip()
        return [t] if t else []
    if not isinstance(node, Tag):
        return []

    has_block_child = any(isinstance(c, Tag) and c.name in _BLOCK_LEVEL_TAGS for c in node.children)

    if not has_block_child:
        leaf_lines = _flatten_leaf_lines(node)
        if node.name == "li" and leaf_lines:
            leaf_lines[0] = "- " + leaf_lines[0]
        return leaf_lines

    out = []
    for child in node.children:
        out.extend(_extract_lines(child))
    return out


def block_to_text(tag):
    """
    Chuyen 1 khoi HTML (co the co tieu de <h2>/<h3>, doan <p>, danh sach
    <ul><li>, chu in dam <strong> xen giua cau...) thanh van ban thuan de
    doc, moi the block (p/h2/h3/li/...) tren 1 dong, danh sach co dau "- ".
    Anh <img> chen giua bai duoc bo hoan toan (chi lay chu). Gop nhieu
    dong trong lien tiep thanh toi da 1 dong trong (ngan cach doan van).
    """
    # Lam viec tren 1 ban sao (parse lai tu chuoi HTML) de KHONG dong vao
    # cay soup goc dang duoc dung cho cac buoc khac (vd is_product_page).
    tag_copy = BeautifulSoup(str(tag), "html.parser")

    for img in tag_copy.find_all("img"):
        img.decompose()
    for br in tag_copy.find_all("br"):
        br.replace_with(chr(10))

    lines = []
    for child in tag_copy.children:
        lines.extend(_extract_lines(child))

    out = []
    blank_run = 0
    for ln in lines:
        if ln == "":
            blank_run += 1
            if blank_run <= 1:
                out.append("")
        else:
            blank_run = 0
            out.append(ln)

    return chr(10).join(out).strip()

def extract_detail_text(soup):
    for selector in DETAIL_SELECTORS:
        tag = soup.select_one(selector)
        if tag:
            text = block_to_text(tag)
            if text and len(text) > 20:
                return text, selector
    return None, None


# ============================================================
# STATE / RESUME cho SCRIPT NAY (rieng, theo ma san pham)
# ============================================================

def load_done_codes():
    done = set()
    if not os.path.exists(OUTPUT_JSONL):
        return done
    with open(OUTPUT_JSONL, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                obj = json.loads(line)
                if obj.get("code"):
                    done.add(obj["code"])
            except Exception:
                continue
    return done


def append_result(obj):
    os.makedirs(STATE_DIR, exist_ok=True)
    with open(OUTPUT_JSONL, "a", encoding="utf-8") as f:
        f.write(json.dumps(obj, ensure_ascii=False) + "\n")


# ============================================================
# DANH SACH URL SAN PHAM (uu tien doc lai tu lan crawl anh truoc)
# ============================================================

def load_existing_product_urls():
    if os.path.exists(EXISTING_PRODUCT_URLS_FILE):
        with open(EXISTING_PRODUCT_URLS_FILE, "r", encoding="utf-8") as f:
            urls = [line.strip() for line in f if line.strip()]
        if urls:
            log("REUSE", f"Đọc lại {len(urls)} URL sản phẩm từ {EXISTING_PRODUCT_URLS_FILE} (không crawl lại site).")
            return urls
    return None


def crawl_product_urls_from_scratch():
    from collections import deque

    log("CRAWL", "Không thấy product_urls.txt cũ — crawl lại từ đầu (chỉ tìm URL, không tải gì khác).")
    queue = deque([BASE_URL])
    queued = {BASE_URL}
    visited = set()
    products = []
    processed = 0

    while queue:
        url = queue.popleft()
        if url in visited or len(visited) >= MAX_URLS:
            continue
        log("CRAWL", f"[{len(visited) + 1}] {url}")
        html = get_html(url)
        visited.add(url)
        if not html:
            continue
        soup = BeautifulSoup(html, "html.parser")
        if is_product_page(soup):
            products.append(url)
        for a in soup.find_all("a", href=True):
            link = normalize_url(urljoin(url, a["href"]))
            if link and same_domain(link) and link not in queued and link not in visited:
                path = urlparse(link).path.lower()
                if path.endswith((".jpg", ".jpeg", ".png", ".css", ".js", ".pdf")):
                    continue
                queued.add(link)
                queue.append(link)
        processed += 1
        sleep_with_log(random.uniform(0.5, 1.5), tag="WAIT")
        batch_cooldown(processed)

    return products


# ============================================================
# PROCESS 1 PRODUCT
# ============================================================

def process_product(url, done_codes):
    log("PRODUCT", url)
    html = get_html(url)
    if not html:
        log("SKIP", "Không lấy được HTML")
        return

    soup = BeautifulSoup(html, "html.parser")
    if not is_product_page(soup):
        log("SKIP", "HTML không có signature product")
        return

    code = extract_product_code(soup)
    if not code:
        log("SKIP", "Không tìm thấy mã sản phẩm")
        return

    if code in done_codes:
        log("PRODUCT", f"code={code} đã lấy trước đó — resume, bỏ qua.")
        return

    name = extract_product_name(soup)
    detail_text, matched_selector = extract_detail_text(soup)

    if not detail_text:
        log("PRODUCT", f"code={code}: KHÔNG tìm thấy khối 'Chi tiết' (kiểm tra lại DETAIL_SELECTORS).")
        append_result({"url": url, "code": code, "name": name, "detail": None, "selector": None})
        done_codes.add(code)
        return

    log("PRODUCT", f"code={code} selector={matched_selector} ({len(detail_text)} ký tự)")
    append_result({"url": url, "code": code, "name": name, "detail": detail_text, "selector": matched_selector})
    done_codes.add(code)


# ============================================================
# MAIN
# ============================================================

def main():
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true", help="Chỉ in ra, KHÔNG ghi file JSONL")
    parser.add_argument("--limit", type=int, default=0, help="Chỉ xử lý N sản phẩm đầu tiên (để thử trước)")
    args = parser.parse_args()

    print()
    print("=" * 75)
    print("VIPSEXTOY PRODUCT DETAIL TEXT DOWNLOADER")
    print("=" * 75)
    print(f"Website : {BASE_URL}")
    print(f"Output  : {OUTPUT_JSONL}")
    print(f"Chế độ  : {'XEM TRƯỚC (--dry-run, không ghi file)' if args.dry_run else 'GHI THẬT'}")
    if args.limit:
        print(f"Giới hạn: {args.limit} sản phẩm đầu tiên")
    print()

    os.makedirs(STATE_DIR, exist_ok=True)
    done_codes = load_done_codes() if not args.dry_run else set()
    if done_codes:
        log("CHECKPOINT", f"Đã có {len(done_codes)} sản phẩm lấy xong từ lần chạy trước.")

    try:
        if not wait_for_manual_unlock():
            log("STOP", "Không mở/xác nhận được session website.")
            return

        product_urls = load_existing_product_urls()
        if product_urls is None:
            product_urls = crawl_product_urls_from_scratch()

        if args.limit:
            product_urls = product_urls[: args.limit]

        log("START", f"Sẽ xử lý {len(product_urls)} sản phẩm.")

        for i, url in enumerate(product_urls, start=1):
            log("PROGRESS", f"{i}/{len(product_urls)}")
            try:
                if args.dry_run:
                    html = get_html(url)
                    if html:
                        soup = BeautifulSoup(html, "html.parser")
                        code = extract_product_code(soup)
                        name = extract_product_name(soup)
                        detail_text, sel = extract_detail_text(soup)
                        print("-" * 75)
                        print(f"URL     : {url}")
                        print(f"Code    : {code}")
                        print(f"Name    : {name}")
                        print(f"Selector: {sel}")
                        print(f"Detail  :\n{detail_text[:500] if detail_text else '(KHÔNG TÌM THẤY)'}")
                else:
                    process_product(url, done_codes)
            except SystemExit:
                raise
            except Exception as e:
                log("PRODUCT ERROR", f"{url} ({e})")

            sleep_with_log(PRODUCT_DELAY, tag="WAIT")
            batch_cooldown(i)

    except KeyboardInterrupt:
        log("STOP", "Người dùng dừng. Đã checkpoint, chạy lại sẽ resume.")
    except SystemExit:
        log("STOP", "Dừng vì session không ổn định. Kiểm tra Chrome rồi chạy lại (sẽ resume).")
    except Exception as e:
        log("FATAL ERROR", str(e))
    finally:
        close_browser()

    print()
    print("=" * 75)
    print("HOÀN TẤT")
    print("=" * 75)
    if not args.dry_run:
        print(f"Kết quả: {OUTPUT_JSONL}")
        print("Bước tiếp theo: node scripts/apply-product-details.mjs --dry-run")
    print()


if __name__ == "__main__":
    main()
