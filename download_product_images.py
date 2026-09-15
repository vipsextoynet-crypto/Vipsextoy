import os
import re
import time
import hashlib
from urllib.parse import urljoin, urlparse, urldefrag

import requests
from bs4 import BeautifulSoup
from concurrent.futures import ThreadPoolExecutor, as_completed


# ============================================================
# CONFIG
# ============================================================

BASE_URL = "https://sextoyeu.com/"
OUTPUT_DIR = r"G:\vipextoy\public\anh"

# Số sản phẩm xử lý đồng thời
MAX_WORKERS = 4

# Delay request
REQUEST_DELAY = 0.4

# Timeout
TIMEOUT = 30

# Số URL tối đa crawler
MAX_URLS = 200000

# Retry
MAX_RETRIES = 3


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
})


# ============================================================
# GLOBAL
# ============================================================

visited_urls = set()
product_urls = set()

downloaded = 0
skipped = 0
failed = 0


# ============================================================
# URL
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

    return url


def same_domain(url):

    try:
        base = urlparse(BASE_URL).netloc.lower()
        host = urlparse(url).netloc.lower()

        return host == base or host.endswith("." + base)

    except Exception:
        return False


# ============================================================
# REQUEST
# ============================================================

def request(url, stream=False):

    for attempt in range(1, MAX_RETRIES + 1):

        try:

            time.sleep(REQUEST_DELAY)

            response = session.get(
                url,
                timeout=TIMEOUT,
                stream=stream,
                allow_redirects=True
            )

            if response.status_code == 200:
                return response

            print(
                f"[HTTP {response.status_code}] "
                f"{url}"
            )

        except Exception as e:

            print(
                f"[RETRY {attempt}/{MAX_RETRIES}] "
                f"{url}"
            )

            if attempt == MAX_RETRIES:
                print(
                    f"[ERROR] {e}"
                )

            time.sleep(attempt * 2)

    return None


# ============================================================
# HTML
# ============================================================

def get_html(url):

    response = request(url)

    if not response:
        return None

    response.encoding = (
        response.apparent_encoding
        or response.encoding
    )

    return response.text


# ============================================================
# PRODUCT CODE
# ============================================================

def extract_product_code(soup):

    # --------------------------------------------------------
    # Ưu tiên tìm text "Mã số:"
    # --------------------------------------------------------

    text = soup.get_text(
        " ",
        strip=True
    )

    patterns = [

        r"Mã\s*số\s*[:：]\s*([A-Za-z0-9._-]+)",

        r"Mã\s*sản\s*phẩm\s*[:：]\s*([A-Za-z0-9._-]+)",

        r"Mã\s*SP\s*[:：]\s*([A-Za-z0-9._-]+)",

        r"SKU\s*[:：]\s*([A-Za-z0-9._-]+)",

    ]

    for pattern in patterns:

        match = re.search(
            pattern,
            text,
            re.IGNORECASE
        )

        if match:

            code = match.group(1).strip()

            return clean_filename(code)

    # --------------------------------------------------------
    # Tìm trong HTML
    # --------------------------------------------------------

    html = str(soup)

    for pattern in patterns:

        match = re.search(
            pattern,
            html,
            re.IGNORECASE
        )

        if match:

            code = match.group(1).strip()

            return clean_filename(code)

    return None


# ============================================================
# CLEAN FILENAME
# ============================================================

def clean_filename(value):

    value = value.strip()

    # Windows invalid chars
    value = re.sub(
        r'[<>:"/\\|?*]',
        "_",
        value
    )

    value = re.sub(
        r"\s+",
        "_",
        value
    )

    return value


# ============================================================
# DETECT PRODUCT URL
# ============================================================

def is_product_url(url):

    path = urlparse(url).path.lower()

    # Cấu trúc sản phẩm của site:
    #
    # --sp1637.html
    #
    if re.search(
        r"--sp\d+\.html?$",
        path
    ):
        return True

    return False


# ============================================================
# FIND LINKS
# ============================================================

def extract_links(soup, current_url):

    links = set()

    for a in soup.find_all(
        "a",
        href=True
    ):

        href = a.get("href")

        if not href:
            continue

        href = href.strip()

        if href.startswith(
            (
                "#",
                "javascript:",
                "mailto:",
                "tel:"
            )
        ):
            continue

        url = urljoin(
            current_url,
            href
        )

        url = normalize_url(url)

        if not url:
            continue

        if not same_domain(url):
            continue

        links.add(url)

    return links


# ============================================================
# IMAGE URL
# ============================================================

def normalize_image_url(
    value,
    page_url
):

    if not value:
        return None

    value = value.strip()

    if value.startswith(
        "data:"
    ):
        return None

    if value.startswith("//"):
        value = "https:" + value

    value = urljoin(
        page_url,
        value
    )

    value, _ = urldefrag(value)

    return value


# ============================================================
# IMAGE DETECTION
# ============================================================

def is_image_url(url):

    if not url:
        return False

    lower = url.lower()

    # bỏ icon/logo rõ ràng
    blocked = [
        "logo",
        "icon",
        "favicon",
        "sprite",
        "facebook",
        "google",
        "zalo",
        "banner",
        "hotline",
        "loading",
        "captcha",
    ]

    if any(
        x in lower
        for x in blocked
    ):
        return False

    path = urlparse(url).path.lower()

    extensions = [
        ".jpg",
        ".jpeg",
        ".png",
        ".webp",
        ".gif",
        ".avif",
    ]

    if any(
        path.endswith(ext)
        for ext in extensions
    ):
        return True

    # URL ảnh không có extension
    image_words = [
        "/image/",
        "/images/",
        "/upload/",
        "/uploads/",
        "/product/",
        "/products/",
        "/media/",
    ]

    return any(
        x in lower
        for x in image_words
    )


# ============================================================
# PRODUCT GALLERY
# ============================================================

def extract_product_images(
    soup,
    page_url
):

    candidates = []

    # --------------------------------------------------------
    # 1. Ảnh trong khu vực sản phẩm
    # --------------------------------------------------------

    product_area = None

    selectors = [

        ".product-detail",

        ".product",

        ".detail-product",

        ".product-image",

        ".product-images",

        ".gallery",

        ".images",

        "#product",

        "#product-detail",

        ".left-detail",

        ".box-detail",

    ]

    for selector in selectors:

        try:

            found = soup.select_one(
                selector
            )

            if found:

                product_area = found
                break

        except Exception:
            pass

    # Nếu không nhận ra container,
    # dùng toàn bộ trang nhưng sẽ lọc kỹ.
    if product_area is None:
        product_area = soup

    # --------------------------------------------------------
    # 2. IMG
    # --------------------------------------------------------

    for img in product_area.find_all("img"):

        attrs = [

            "src",

            "data-src",

            "data-original",

            "data-image",

            "data-original-src",

            "data-lazy-src",

            "data-url",

        ]

        for attr in attrs:

            value = img.get(attr)

            if not value:
                continue

            image_url = normalize_image_url(
                value,
                page_url
            )

            if image_url:
                candidates.append(
                    image_url
                )

        # srcset
        srcset = img.get("srcset")

        if srcset:

            for item in srcset.split(","):

                item = item.strip()

                if not item:
                    continue

                image_url = item.split(
                    " "
                )[0]

                image_url = normalize_image_url(
                    image_url,
                    page_url
                )

                if image_url:
                    candidates.append(
                        image_url
                    )

    # --------------------------------------------------------
    # 3. LINK tới ảnh lớn
    # --------------------------------------------------------

    for a in product_area.find_all(
        "a",
        href=True
    ):

        href = normalize_image_url(
            a.get("href"),
            page_url
        )

        if href and is_image_url(href):

            candidates.append(href)

    # --------------------------------------------------------
    # 4. Background-image
    # --------------------------------------------------------

    for tag in product_area.find_all(
        style=True
    ):

        style = tag.get(
            "style",
            ""
        )

        matches = re.findall(
            r'url\(["\']?([^"\')]+)',
            style,
            re.IGNORECASE
        )

        for value in matches:

            image_url = normalize_image_url(
                value,
                page_url
            )

            if image_url:
                candidates.append(
                    image_url
                )

    # --------------------------------------------------------
    # 5. Lọc
    # --------------------------------------------------------

    result = []

    seen = set()

    for url in candidates:

        if not url:
            continue

        if url in seen:
            continue

        if not is_image_url(url):
            continue

        seen.add(url)

        result.append(url)

    return result


# ============================================================
# IMAGE EXTENSION
# ============================================================

def get_extension(
    url,
    content_type=""
):

    path = urlparse(url).path.lower()

    for ext in [
        ".jpg",
        ".jpeg",
        ".png",
        ".webp",
        ".gif",
        ".avif",
    ]:

        if path.endswith(ext):
            return ext

    content_type = (
        content_type.lower()
    )

    if "jpeg" in content_type:
        return ".jpg"

    if "png" in content_type:
        return ".png"

    if "webp" in content_type:
        return ".webp"

    if "gif" in content_type:
        return ".gif"

    if "avif" in content_type:
        return ".avif"

    return ".jpg"


# ============================================================
# IMAGE HASH
# ============================================================

def file_hash(filepath):

    try:

        h = hashlib.md5()

        with open(
            filepath,
            "rb"
        ) as f:

            while True:

                chunk = f.read(
                    1024 * 1024
                )

                if not chunk:
                    break

                h.update(chunk)

        return h.hexdigest()

    except Exception:
        return None


# ============================================================
# DOWNLOAD IMAGE
# ============================================================

def download_image(
    image_url,
    folder,
    index
):

    global downloaded
    global skipped
    global failed

    os.makedirs(
        folder,
        exist_ok=True
    )

    # --------------------------------------------------------
    # tải
    # --------------------------------------------------------

    response = request(
        image_url,
        stream=True
    )

    if not response:

        failed += 1

        return False

    content_type = response.headers.get(
        "Content-Type",
        ""
    )

    if (
        "image/" not in content_type
        and not is_image_url(image_url)
    ):

        return False

    extension = get_extension(
        image_url,
        content_type
    )

    filepath = os.path.join(
        folder,
        f"{index:02d}{extension}"
    )

    # --------------------------------------------------------
    # Nếu tồn tại
    # --------------------------------------------------------

    if os.path.exists(filepath):

        skipped += 1

        print(
            f"      [SKIP] "
            f"{os.path.basename(filepath)}"
        )

        return True

    # --------------------------------------------------------
    # ghi
    # --------------------------------------------------------

    try:

        with open(
            filepath,
            "wb"
        ) as f:

            for chunk in response.iter_content(
                chunk_size=128 * 1024
            ):

                if chunk:
                    f.write(chunk)

        # file rỗng
        if os.path.getsize(
            filepath
        ) < 500:

            os.remove(filepath)

            failed += 1

            return False

        downloaded += 1

        print(
            f"      [OK] "
            f"{os.path.basename(filepath)}"
        )

        return True

    except Exception as e:

        print(
            f"      [ERROR] "
            f"{image_url}"
        )

        failed += 1

        if os.path.exists(filepath):

            try:
                os.remove(filepath)
            except:
                pass

        return False


# ============================================================
# PROCESS PRODUCT
# ============================================================

def process_product(url):

    print()
    print(
        "=" * 75
    )

    print(
        f"[PRODUCT] {url}"
    )

    html = get_html(url)

    if not html:

        return False

    soup = BeautifulSoup(
        html,
        "html.parser"
    )

    # --------------------------------------------------------
    # mã sản phẩm
    # --------------------------------------------------------

    code = extract_product_code(
        soup
    )

    if not code:

        print(
            "[SKIP] Không tìm thấy mã sản phẩm"
        )

        return False

    print(
        f"[CODE] {code}"
    )

    # --------------------------------------------------------
    # folder
    # --------------------------------------------------------

    folder = os.path.join(
        OUTPUT_DIR,
        code
    )

    # --------------------------------------------------------
    # ảnh
    # --------------------------------------------------------

    images = extract_product_images(
        soup,
        url
    )

    print(
        f"[FOUND IMAGES] "
        f"{len(images)}"
    )

    if not images:

        print(
            "[NO IMAGES]"
        )

        return False

    # --------------------------------------------------------
    # download
    # --------------------------------------------------------

    for index, image_url in enumerate(
        images,
        start=1
    ):

        print(
            f"   [{index}/{len(images)}] "
            f"{image_url}"
        )

        download_image(
            image_url,
            folder,
            index
        )

    return True


# ============================================================
# CRAWL
# ============================================================

def crawl():

    queue = [
        BASE_URL
    ]

    while queue:

        url = queue.pop(0)

        if url in visited_urls:
            continue

        if len(visited_urls) >= MAX_URLS:
            break

        visited_urls.add(url)

        print()
        print(
            f"[CRAWL {len(visited_urls)}] "
            f"{url}"
        )

        html = get_html(url)

        if not html:
            continue

        soup = BeautifulSoup(
            html,
            "html.parser"
        )

        # ----------------------------------------------------
        # product?
        # ----------------------------------------------------

        if is_product_url(url):

            code = extract_product_code(
                soup
            )

            if code:

                if url not in product_urls:

                    product_urls.add(url)

                    print(
                        f"[PRODUCT FOUND] "
                        f"{code}"
                    )

        # ----------------------------------------------------
        # links
        # ----------------------------------------------------

        for link in extract_links(
            soup,
            url
        ):

            if link in visited_urls:
                continue

            # Nếu là sản phẩm
            # ưu tiên xử lý
            if is_product_url(link):

                product_urls.add(
                    link
                )

            # đưa vào queue
            queue.append(link)

    print()
    print(
        "=" * 75
    )

    print(
        f"URL đã crawl: "
        f"{len(visited_urls)}"
    )

    print(
        f"Sản phẩm: "
        f"{len(product_urls)}"
    )


# ============================================================
# SAVE PRODUCT LIST
# ============================================================

def save_product_list():

    os.makedirs(
        OUTPUT_DIR,
        exist_ok=True
    )

    filepath = os.path.join(
        OUTPUT_DIR,
        "_product_urls.txt"
    )

    with open(
        filepath,
        "w",
        encoding="utf-8"
    ) as f:

        for url in sorted(
            product_urls
        ):

            f.write(
                url + "\n"
            )

    print(
        f"[SAVE] {filepath}"
    )


# ============================================================
# SAVE PRODUCT STATUS
# ============================================================

def save_product_status():

    filepath = os.path.join(
        OUTPUT_DIR,
        "_product_status.txt"
    )

    with open(
        filepath,
        "w",
        encoding="utf-8"
    ) as f:

        for url in sorted(
            product_urls
        ):

            f.write(
                f"{url}\n"
            )


# ============================================================
# DOWNLOAD ALL
# ============================================================

def download_all():

    print()
    print(
        "=" * 75
    )

    print(
        f"Bắt đầu tải "
        f"{len(product_urls)} sản phẩm"
    )

    print(
        "=" * 75
    )

    with ThreadPoolExecutor(
        max_workers=MAX_WORKERS
    ) as executor:

        futures = {

            executor.submit(
                process_product,
                url
            ): url

            for url in sorted(
                product_urls
            )

        }

        completed = 0

        for future in as_completed(
            futures
        ):

            url = futures[
                future
            ]

            completed += 1

            try:

                future.result()

            except Exception as e:

                print(
                    f"[PRODUCT ERROR] "
                    f"{url}"
                )

                print(e)

            print(
                f"[PROGRESS] "
                f"{completed}/"
                f"{len(product_urls)}"
            )


# ============================================================
# MAIN
# ============================================================

def main():

    print()
    print(
        "=" * 75
    )

    print(
        "SExtoyEU PRODUCT IMAGE DOWNLOADER"
    )

    print(
        "=" * 75
    )

    print(
        f"Website : {BASE_URL}"
    )

    print(
        f"Output  : {OUTPUT_DIR}"
    )

    print()

    os.makedirs(
        OUTPUT_DIR,
        exist_ok=True
    )

    # --------------------------------------------------------
    # 1. Crawl
    # --------------------------------------------------------

    crawl()

    # --------------------------------------------------------
    # 2. Save URLs
    # --------------------------------------------------------

    save_product_list()

    # --------------------------------------------------------
    # 3. Download
    # --------------------------------------------------------

    download_all()

    # --------------------------------------------------------
    # Summary
    # --------------------------------------------------------

    print()
    print(
        "=" * 75
    )

    print(
        "HOÀN TẤT"
    )

    print(
        "=" * 75
    )

    print(
        f"URL crawl      : "
        f"{len(visited_urls)}"
    )

    print(
        f"Sản phẩm       : "
        f"{len(product_urls)}"
    )

    print(
        f"Ảnh tải        : "
        f"{downloaded}"
    )

    print(
        f"Ảnh bỏ qua     : "
        f"{skipped}"
    )

    print(
        f"Ảnh lỗi        : "
        f"{failed}"
    )

    print(
        f"Folder         : "
        f"{OUTPUT_DIR}"
    )

    print()


if __name__ == "__main__":
    main()