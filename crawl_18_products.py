import os
import re
import json
import time
import html as html_lib
import unicodedata
from urllib.parse import urljoin, urlparse, urldefrag

import requests
from bs4 import BeautifulSoup
from concurrent.futures import ThreadPoolExecutor, as_completed


# ============================================================
# CONFIG
# ============================================================

BASE_URL = "https://vipsextoy.net"
BASE_HOST = urlparse(BASE_URL).netloc.lower()

# Thư mục ảnh local
OUTPUT_DIR = r"G:\vipextoy\public\anh1"

# File kết quả
OUTPUT_JSON = os.path.join(OUTPUT_DIR, "_181_products.json")
OUTPUT_TS = os.path.join(OUTPUT_DIR, "_181_products.ts")
OUTPUT_URLS = os.path.join(OUTPUT_DIR, "_181_product_urls.txt")
OUTPUT_ERRORS = os.path.join(OUTPUT_DIR, "_181_errors.txt")

MAX_WORKERS = 4
REQUEST_DELAY = 0.4
TIMEOUT = 30
MAX_RETRIES = 3
MAX_URLS = 200000


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

stats = {
    "downloaded": 0,
    "skipped": 0,
    "failed": 0,
    "products_ok": 0,
    "products_error": 0,
}

errors = []


# ============================================================
# BASIC HELPERS
# ============================================================

def clean_text(value):
    if not value:
        return ""
    value = html_lib.unescape(value)
    value = value.replace("\xa0", " ")
    value = re.sub(r"[ \t]+", " ", value)
    value = re.sub(r"\n\s*\n+", "\n\n", value)
    return value.strip()


def clean_filename(value):
    value = clean_text(value)
    value = re.sub(r'[<>:"/\\|?*]', "_", value)
    value = re.sub(r"\s+", "_", value)
    return value.strip("._ ")


def slugify(value):
    value = clean_text(value).lower()
    value = unicodedata.normalize("NFKD", value)
    value = "".join(
        c for c in value
        if not unicodedata.combining(c)
    )
    value = value.replace("đ", "d")
    value = re.sub(r"[^a-z0-9]+", "-", value)
    value = re.sub(r"-+", "-", value)
    return value.strip("-")


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


NUMERIC_ONLY_HREF = re.compile(r"^\d+$")


def is_bogus_numeric_href(href):
    """
    Một số theme dùng href chỉ chứa ID sản phẩm dạng số
    (vd href="1976") cho nút 'Xem nhanh' / 'Thêm giỏ hàng',
    xử lý bằng JS chứ không phải link điều hướng thật.
    Nếu ghép urljoin() sẽ ra URL rác kiểu chuoi18.com/1976 (404).
    """
    return bool(NUMERIC_ONLY_HREF.fullmatch(href.strip()))


def same_domain(url):
    try:
        host = urlparse(url).netloc.lower()
        return host == BASE_HOST or host.endswith("." + BASE_HOST)
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
                allow_redirects=True,
            )

            if response.status_code == 200:
                return response

            print(f"[HTTP {response.status_code}] {url}")

            # Lỗi phía client (404, 403, ...) thì retry cũng vô ích.
            if 400 <= response.status_code < 500:
                return None

        except Exception as e:
            print(f"[RETRY {attempt}/{MAX_RETRIES}] {url}")

            if attempt == MAX_RETRIES:
                print(f"[ERROR] {e}")

        time.sleep(attempt * 2)

    return None


def get_html(url):
    response = request(url)

    if not response:
        return None

    response.encoding = (
        response.apparent_encoding
        or response.encoding
        or "utf-8"
    )

    return response.text


# ============================================================
# PRODUCT URL
# ============================================================

PRODUCT_PATTERN = re.compile(
    r"^/san-pham/[^/]+-\d+\.html?$",
    re.IGNORECASE
)


def is_product_url(url):
    if not url or not same_domain(url):
        return False

    return bool(
        PRODUCT_PATTERN.fullmatch(
            urlparse(url).path
        )
    )


def get_effective_base(soup, current_url):
    """
    Nhiều theme render href tương đối (không có dấu / ở đầu),
    ví dụ href="san-pham/xxx/11". Trình duyệt sẽ resolve theo
    thẻ <base href="..."> nếu trang có khai báo, KHÔNG phải
    theo path của URL hiện tại.

    Nếu không dùng đúng base này, urljoin() sẽ nối lồng path
    hiện tại (đang ở 1 trang danh mục) với href tương đối, tạo
    ra URL sai và ngày càng dài ra (san-pham/a/san-pham/b/...).
    """
    base_tag = soup.find("base", href=True)

    if base_tag:
        base_href = base_tag.get("href", "").strip()
        if base_href:
            resolved = normalize_url(
                urljoin(current_url, base_href)
            )
            if resolved:
                return resolved

    return current_url


def is_safe_discovery_url(url):
    if not url or not same_domain(url) or is_product_url(url):
        return False

    parsed = urlparse(url)
    path = parsed.path or "/"
    lower = path.lower()

    # An toàn bổ sung: nếu "san-pham" xuất hiện lặp lại trong path,
    # gần như chắc chắn là URL bị nối lồng do resolve sai base/relative.
    if lower.count("/san-pham/") > 1:
        return False

    if lower.startswith(("/upload/", "/uploads/", "/media/")):
        return False

    if any(
        x in parsed.netloc.lower()
        for x in ("vimeo.com", "player.vimeo.com")
    ):
        return False

    if lower.endswith((
        ".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif",
        ".mp4", ".webm", ".mov", ".avi", ".mkv",
        ".mp3", ".wav", ".ogg",
        ".css", ".js", ".json", ".xml", ".pdf",
        ".zip", ".rar", ".7z",
        ".doc", ".docx", ".xls", ".xlsx",
        ".ppt", ".pptx",
    )):
        return False

    return True


def extract_product_links(soup, current_url):
    links = set()

    base = get_effective_base(soup, current_url)

    for a in soup.find_all("a", href=True):
        href = a.get("href", "").strip()

        if not href or href.startswith(
            ("#", "javascript:", "mailto:", "tel:")
        ):
            continue

        if is_bogus_numeric_href(href):
            continue

        url = normalize_url(
            urljoin(base, href)
        )

        if url and is_product_url(url):
            links.add(url)

    return links


# ============================================================
# PRODUCT DATA
# ============================================================

def extract_title(soup):
    # HTML thực tế của Chuoi18 dùng:
    # <li class="ten">...</li>
    node = soup.select_one("li.ten")

    if node:
        value = clean_text(node.get_text(" ", strip=True))
        if value:
            return value

    # fallback
    for selector in ("h1", "div.name", ".product_name", "title"):
        node = soup.select_one(selector)
        if node:
            value = clean_text(node.get_text(" ", strip=True))
            if value:
                return value

    return ""


def extract_product_code(soup):
    text = soup.get_text(" ", strip=True)

    patterns = [
        r"Mã\s*sản\s*phẩm\s*[:：]\s*([A-Za-z0-9._-]+)",
        r"Mã\s*số\s*[:：]\s*([A-Za-z0-9._-]+)",
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
            return clean_filename(match.group(1))

    return ""


def extract_price(soup):
    # Tìm trong phần thông tin đầu sản phẩm trước.
    text = soup.get_text(" ", strip=True)

    patterns = [
        r"Giá\s*K\.?mãi\s*[:：]?\s*([\d\.,]+)\s*vnđ",
        r"Giá\s*khuyến\s*mãi\s*[:：]?\s*([\d\.,]+)\s*vnđ",
        r"Giá\s*[:：]?\s*([\d\.,]+)\s*vnđ",
    ]

    for pattern in patterns:
        match = re.search(
            pattern,
            text,
            re.IGNORECASE
        )

        if match:
            raw = match.group(1)
            digits = re.sub(r"[^\d]", "", raw)

            if digits:
                return int(digits)

    return 0


def extract_compare_at(soup):
    text = soup.get_text(" ", strip=True)

    regular = re.search(
        r"Giá\s*[:：]?\s*([\d\.,]+)\s*vnđ",
        text,
        re.IGNORECASE
    )

    promo = re.search(
        r"(?:Giá\s*K\.?mãi|Giá\s*khuyến\s*mãi)\s*[:：]?\s*([\d\.,]+)\s*vnđ",
        text,
        re.IGNORECASE
    )

    if not regular or not promo:
        return None

    normal = int(
        re.sub(r"[^\d]", "", regular.group(1))
    )

    sale = int(
        re.sub(r"[^\d]", "", promo.group(1))
    )

    if normal > sale:
        return normal

    return None


def extract_category(soup, title=""):
    # Breadcrumb thực tế:
    # div.link_seo
    # ... >> Dương Vật Giả Cao Cấp >> PRODUCT
    breadcrumb = soup.select_one("div.link_seo")

    if breadcrumb:
        links = breadcrumb.find_all("a")

        values = [
            clean_text(a.get_text(" ", strip=True))
            for a in links
        ]

        values = [
            x for x in values
            if x and x.lower() not in ("trang chủ", "home")
        ]

        # Lấy link category cuối cùng.
        if values:
            return values[-1]

        # Fallback nếu HTML có text xen giữa
        full = clean_text(
            breadcrumb.get_text(" ", strip=True)
        )

        if ">>" in full:
            parts = [
                clean_text(x)
                for x in full.split(">>")
                if clean_text(x)
            ]

            if parts:
                last = parts[-1]

                if title and last == title and len(parts) >= 2:
                    return parts[-2]

                return last

    return "Chưa phân loại"


def find_info_container(soup):
    """
    Tìm vùng 'Thông tin sản phẩm'.

    Chuoi18 hiện có tab:
    <li data-vitri="0" class="active">Thông tin sản phẩm</li>

    Tùy template, phần nội dung thường nằm trong #content_tabs.
    Ưu tiên #content_tabs nhưng vẫn fallback theo text.
    """

    content_tabs = soup.select_one("#content_tabs")

    if content_tabs:
        return content_tabs

    # Fallback: tìm node chứa 'Thông tin sản phẩm'
    tab = None

    for node in soup.find_all(
        ["li", "div", "a", "span"]
    ):
        txt = clean_text(
            node.get_text(" ", strip=True)
        ).lower()

        if txt == "thông tin sản phẩm":
            tab = node
            break

    if tab:
        parent = tab.parent
        if parent:
            return parent

    return None


def extract_description(soup):
    container = find_info_container(soup)

    if not container:
        return ""

    # Copy để loại bỏ hình ảnh/script/style trước khi lấy text.
    clone = BeautifulSoup(
        str(container),
        "html.parser"
    )

    for tag in clone.find_all(
        ["img", "script", "style", "iframe", "video"]
    ):
        tag.decompose()

    text = clone.get_text(
        "\n",
        strip=True
    )

    text = clean_text(text)

    # Bỏ tiêu đề tab nếu nó lọt vào content.
    text = re.sub(
        r"^Thông tin sản phẩm\s*",
        "",
        text,
        flags=re.IGNORECASE
    )

    return text.strip()


def extract_features(description):
    if not description:
        return []

    features = []

    for line in description.splitlines():
        line = clean_text(line)
        line = re.sub(r"^[•●▪◦\-–—*]+\s*", "", line)
        line = line.strip()

        if not line:
            continue

        # Chỉ lấy các dòng dạng thông tin ngắn.
        if ":" in line and len(line) <= 180:
            features.append(line)
        elif re.match(
            r"^(chất liệu|kích thước|màu sắc|trọng lượng|"
            r"pin|thời gian|chế độ|thương hiệu|xuất xứ|"
            r"chức năng|tính năng|điện áp|sạc|chống nước)",
            line,
            re.IGNORECASE
        ):
            features.append(line)

    # unique, tối đa 8
    result = []
    seen = set()

    for item in features:
        key = item.lower()
        if key not in seen:
            seen.add(key)
            result.append(item)

    return result[:8]


def extract_images_from_info(soup, page_url):
    """
    Lấy toàn bộ ảnh trong 'Thông tin sản phẩm'.
    Đồng thời lấy gallery chính/thumbnail nếu ảnh không nằm trong content.
    """

    candidates = []

    container = find_info_container(soup)

    if container:
        for img in container.find_all("img"):
            for attr in (
                "src",
                "data-src",
                "data-original",
                "data-image",
                "data-original-src",
                "data-lazy-src",
                "data-url",
            ):
                value = img.get(attr)
                if value:
                    candidates.append(value)

            srcset = img.get("srcset")
            if srcset:
                for item in srcset.split(","):
                    item = item.strip()
                    if item:
                        candidates.append(
                            item.split()[0]
                        )

    # Fallback/gallery ảnh chính.
    gallery = soup.select_one(
        "div.left.item_image.ipad100"
    )

    if gallery:
        for a in gallery.select(
            "div.main a.jqzoom[href]"
        ):
            candidates.append(a.get("href"))

        for a in gallery.select(
            "div.related div.item a[href]"
        ):
            candidates.append(a.get("href"))

    result = []
    seen = set()

    for value in candidates:
        if not value:
            continue

        value = value.strip()

        if value.lower().startswith("data:"):
            continue

        if value.startswith("//"):
            value = "https:" + value

        url, _ = urldefrag(
            urljoin(page_url, value)
        )

        if not same_domain(url):
            continue

        path = urlparse(url).path.lower()

        if not path.endswith(
            (".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif")
        ):
            continue

        if url not in seen:
            seen.add(url)
            result.append(url)

    return result


# ============================================================
# IMAGE DOWNLOAD
# ============================================================

def get_extension(url, content_type=""):
    path = urlparse(url).path.lower()

    for ext in (
        ".jpg",
        ".jpeg",
        ".png",
        ".webp",
        ".gif",
        ".avif",
    ):
        if path.endswith(ext):
            return ext

    content_type = content_type.lower()

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


def download_image(image_url, folder, index):
    os.makedirs(folder, exist_ok=True)

    # Tên file chuẩn để products.ts dùng:
    # /anh/DC91C/01.jpg
    base_path = os.path.join(
        folder,
        f"{index:02d}"
    )

    # Nếu đã có bất kỳ extension nào thì skip.
    for ext in (
        ".jpg",
        ".jpeg",
        ".png",
        ".webp",
        ".gif",
        ".avif",
    ):
        existing = base_path + ext

        if os.path.exists(existing):
            stats["skipped"] += 1
            print(
                f"      [SKIP] {os.path.basename(existing)}"
            )
            return "/" + os.path.relpath(
                existing,
                os.path.dirname(OUTPUT_DIR)
            ).replace("\\", "/")

    response = request(
        image_url,
        stream=True
    )

    if not response:
        stats["failed"] += 1
        return None

    content_type = response.headers.get(
        "Content-Type",
        ""
    )

    extension = get_extension(
        image_url,
        content_type
    )

    filepath = base_path + extension

    try:
        with open(filepath, "wb") as f:
            for chunk in response.iter_content(
                chunk_size=128 * 1024
            ):
                if chunk:
                    f.write(chunk)

        if os.path.getsize(filepath) < 500:
            os.remove(filepath)
            stats["failed"] += 1
            return None

        stats["downloaded"] += 1

        print(
            f"      [OK] {os.path.basename(filepath)}"
        )

        return (
            "/anh/"
            + os.path.basename(folder)
            + "/"
            + os.path.basename(filepath)
        )

    except Exception as e:
        stats["failed"] += 1

        print(
            f"      [ERROR IMAGE] {image_url}"
        )
        print(e)

        if os.path.exists(filepath):
            try:
                os.remove(filepath)
            except Exception:
                pass

        return None


# ============================================================
# ICON / BLURB
# ============================================================

def guess_icon(category, title):
    text = f"{category} {title}".lower()

    if "gel" in text:
        return "wave"

    if "trứng rung" in text:
        return "spark"

    if "vòng rung" in text:
        return "ring"

    if "búp bê" in text:
        return "petal"

    if "massage" in text:
        return "orb"

    if "hậu môn" in text:
        return "drop"

    if "bao cao su" in text:
        return "ring"

    if "xịt" in text:
        return "drop"

    if "bds" in text:
        return "curve"

    return "spark"


def make_blurb(category, description):
    if description:
        first_lines = [
            clean_text(x)
            for x in description.splitlines()
            if clean_text(x)
        ]

        if first_lines:
            text = first_lines[0]
            if len(text) > 180:
                text = text[:177].rstrip() + "..."
            return text

    return (
        f"Sản phẩm {category.lower()}, "
        "thông tin được lấy trực tiếp từ Chuoi18."
    )


# ============================================================
# PRODUCT PROCESS
# ============================================================

def process_product(url):
    print()
    print("=" * 80)
    print("[PRODUCT]", url)

    try:
        html = get_html(url)

        if not html:
            raise RuntimeError(
                "Không tải được HTML"
            )

        soup = BeautifulSoup(
            html,
            "html.parser"
        )

        title = extract_title(soup)
        code = extract_product_code(soup)
        category = extract_category(
            soup,
            title
        )
        price = extract_price(soup)
        compare_at = extract_compare_at(soup)
        description = extract_description(soup)
        features = extract_features(
            description
        )

        if not title:
            raise RuntimeError(
                "Không tìm thấy tên sản phẩm"
            )

        if not code:
            raise RuntimeError(
                "Không tìm thấy mã sản phẩm"
            )

        if not category:
            category = "Chưa phân loại"

        category_slug = slugify(category)

        images = extract_images_from_info(
            soup,
            url
        )

        print("[NAME]", title)
        print("[SKU]", code)
        print("[CATEGORY]", category)
        print("[PRICE]", price)
        print("[COMPARE]", compare_at)
        print("[IMAGES]", len(images))

        folder = os.path.join(
            OUTPUT_DIR,
            code
        )

        local_images = []

        for index, image_url in enumerate(
            images,
            start=1
        ):
            print(
                f"   [{index}/{len(images)}] {image_url}"
            )

            local_path = download_image(
                image_url,
                folder,
                index
            )

            if local_path:
                local_images.append(
                    local_path
                )

        product = {
            "slug": (
                slugify(code)
                + "-"
                + slugify(title)
            ),
            "sku": code,
            "name": title,
            "category": category,
            "categorySlug": category_slug,
            "price": price,
            "blurb": make_blurb(
                category,
                description
            ),
            "description": description,
            "features": features,
            "icon": guess_icon(
                category,
                title
            ),
            "image": (
                local_images[0]
                if local_images
                else None
            ),
            "images": local_images,
            "sourceUrl": url,
        }

        if compare_at:
            product["compareAt"] = compare_at

        # Không để None trong TS nếu không có ảnh.
        if not product["image"]:
            product.pop("image")

        if not product["images"]:
            product.pop("images")

        stats["products_ok"] += 1

        print(
            f"[DONE] {code} | "
            f"{len(local_images)} ảnh"
        )

        return product

    except Exception as e:
        stats["products_error"] += 1

        message = f"{url} | {e}"
        errors.append(message)

        print("[PRODUCT ERROR]", message)

        return None


# ============================================================
# CRAWL
# ============================================================

def crawl():
    queue = [
        normalize_url(BASE_URL)
    ]

    queued = set(queue)

    while queue:
        url = queue.pop(0)

        if (
            url in visited_urls
            or len(visited_urls) >= MAX_URLS
        ):
            continue

        visited_urls.add(url)

        print(
            f"\n[CRAWL {len(visited_urls)}] {url}"
        )

        html = get_html(url)

        if not html:
            continue

        soup = BeautifulSoup(
            html,
            "html.parser"
        )

        base = get_effective_base(soup, url)

        # Product URLs
        for link in extract_product_links(
            soup,
            url
        ):
            if link not in product_urls:
                product_urls.add(link)

                print(
                    "[PRODUCT FOUND]",
                    link
                )

        # Discovery URLs
        for a in soup.find_all(
            "a",
            href=True
        ):
            href = a.get(
                "href",
                ""
            ).strip()

            if not href or href.startswith(
                ("#", "javascript:", "mailto:", "tel:")
            ):
                continue

            if is_bogus_numeric_href(href):
                continue

            link = normalize_url(
                urljoin(base, href)
            )

            if not is_safe_discovery_url(link):
                continue

            if (
                link not in queued
                and link not in visited_urls
            ):
                queued.add(link)
                queue.append(link)

    print()
    print("=" * 80)
    print("CRAWL COMPLETE")
    print("URL đã crawl :", len(visited_urls))
    print("Sản phẩm     :", len(product_urls))
    print("=" * 80)


# ============================================================
# OUTPUT
# ============================================================

def save_urls():
    os.makedirs(
        OUTPUT_DIR,
        exist_ok=True
    )

    with open(
        OUTPUT_URLS,
        "w",
        encoding="utf-8"
    ) as f:
        for url in sorted(product_urls):
            f.write(url + "\n")

    print("[SAVE URLS]", OUTPUT_URLS)


def save_errors():
    with open(
        OUTPUT_ERRORS,
        "w",
        encoding="utf-8"
    ) as f:
        for item in errors:
            f.write(item + "\n")

    print("[SAVE ERRORS]", OUTPUT_ERRORS)


def json_dump(products):
    with open(
        OUTPUT_JSON,
        "w",
        encoding="utf-8"
    ) as f:
        json.dump(
            products,
            f,
            ensure_ascii=False,
            indent=2
        )

    print("[SAVE JSON]", OUTPUT_JSON)


def ts_string(value):
    return json.dumps(
        value,
        ensure_ascii=False
    )


def product_to_ts(product):
    lines = ["  {"]

    ordered_keys = [
        "slug",
        "sku",
        "name",
        "category",
        "categorySlug",
        "price",
        "compareAt",
        "blurb",
        "description",
        "features",
        "icon",
        "image",
        "images",
        "sourceUrl",
    ]

    for key in ordered_keys:
        if key not in product:
            continue

        value = product[key]

        if key == "features":
            arr = ", ".join(
                ts_string(x)
                for x in value
            )
            lines.append(
                f"    features: [{arr}],"
            )

        elif key == "images":
            arr = ", ".join(
                ts_string(x)
                for x in value
            )
            lines.append(
                f"    images: [{arr}],"
            )

        elif isinstance(value, bool):
            lines.append(
                f"    {key}: "
                f"{str(value).lower()},"
            )

        elif isinstance(value, int):
            lines.append(
                f"    {key}: {value},"
            )

        elif value is None:
            continue

        else:
            lines.append(
                f"    {key}: "
                f"{ts_string(value)},"
            )

    lines.append("  },")

    return "\n".join(lines)


def save_ts(products):
    with open(
        OUTPUT_TS,
        "w",
        encoding="utf-8"
    ) as f:
        f.write(
            "// ============================================================\n"
        )
        f.write(
            "// PRODUCTS CRAWLED FROM CHUOI18.COM\n"
        )
        f.write(
            "// Generated automatically. Review before merging.\n"
        )
        f.write(
            "// ============================================================\n\n"
        )

        f.write(
            "export const chuoi18Products = [\n"
        )

        for product in products:
            f.write(
                product_to_ts(product)
            )
            f.write("\n")

        f.write(
            "] as const;\n"
        )

    print("[SAVE TS]", OUTPUT_TS)


# ============================================================
# MAIN
# ============================================================

def main():
    print()
    print("=" * 80)
    print("CHUOI18 PRODUCT CRAWLER")
    print("=" * 80)
    print("Website :", BASE_URL)
    print("Output  :", OUTPUT_DIR)
    print("=" * 80)

    os.makedirs(
        OUTPUT_DIR,
        exist_ok=True
    )

    # 1. Crawl
    crawl()

    # 2. Save URLs
    save_urls()

    # 3. Process products
    products = []

    print()
    print("=" * 80)
    print(
        f"BAT DAU XU LY {len(product_urls)} SAN PHAM"
    )
    print("=" * 80)

    with ThreadPoolExecutor(
        max_workers=MAX_WORKERS
    ) as executor:

        futures = {
            executor.submit(
                process_product,
                url
            ): url
            for url in sorted(product_urls)
        }

        completed = 0

        for future in as_completed(futures):
            completed += 1

            url = futures[future]

            try:
                product = future.result()

                if product:
                    products.append(product)

            except Exception as e:
                errors.append(
                    f"{url} | {e}"
                )

            print(
                f"[PROGRESS] "
                f"{completed}/{len(product_urls)}"
            )

    # Giữ thứ tự ổn định
    products.sort(
        key=lambda x: (
            x.get("sku", ""),
            x.get("name", "")
        )
    )

    # 4. Save
    json_dump(products)
    save_ts(products)
    save_errors()

    # 5. Summary
    print()
    print("=" * 80)
    print("HOAN TAT")
    print("=" * 80)
    print("URL crawl       :", len(visited_urls))
    print("Sản phẩm tìm    :", len(product_urls))
    print("Sản phẩm OK     :", stats["products_ok"])
    print("Sản phẩm lỗi    :", stats["products_error"])
    print("Ảnh tải         :", stats["downloaded"])
    print("Ảnh bỏ qua      :", stats["skipped"])
    print("Ảnh lỗi         :", stats["failed"])
    print()
    print("JSON :", OUTPUT_JSON)
    print("TS   :", OUTPUT_TS)
    print("URL  :", OUTPUT_URLS)
    print("ERR  :", OUTPUT_ERRORS)
    print("=" * 80)


if __name__ == "__main__":
    main()
