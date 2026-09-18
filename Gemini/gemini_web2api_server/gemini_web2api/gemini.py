"""Gemini StreamGenerate protocol implementation with httpx streaming."""
import json
import time
import uuid
import re
import urllib.request
import urllib.parse
import ssl
import os
import hashlib
import random
from typing import Optional

try:
    import httpx
    HAS_HTTPX = True
except ImportError:
    HAS_HTTPX = False

from .config import CONFIG

_ssl_ctx = None
_cookie_cache = {}   # {cookie_file_or_"": {"str":..., "sapisid":..., "mtime":...}}
_httpx_client = None
_account_pool_state = {"files": None, "idx": 0, "cooldown_until": {}}


def log(msg: str):
    if CONFIG["log_requests"]:
        import sys
        sys.stderr.write(f"[{time.strftime('%H:%M:%S')}] {msg}\n")
        sys.stderr.flush()


def _detect_status(exc: Exception):
    """Trả về (status_code_or_None, error_text_lowercase)."""
    status = getattr(exc, "code", None)
    response = getattr(exc, "response", None)
    if response is not None:
        status = getattr(response, "status_code", status)
    return status, str(exc).lower()


def _retry_after_header_seconds(exc: Exception) -> Optional[float]:
    response = getattr(exc, "response", None)
    if response is not None:
        try:
            retry_after = response.headers.get("Retry-After")
            if retry_after:
                return max(1.0, float(retry_after)) + random.uniform(0.5, 2.5)
        except Exception:
            pass
    return None


def _is_quota_error(exc: Exception) -> bool:
    """429 (rate limit) hoặc 403 (thường do phiên/tài khoản bị Google tạm chặn) -
    2 loại lỗi nên LUÂN PHIÊN sang tài khoản khác thay vì chỉ ngồi chờ."""
    status, text = _detect_status(exc)
    return (
        status in (429, 403)
        or "429" in text or "too many requests" in text or "rate limit" in text
        or "forbidden" in text
    )


def _retry_wait_seconds(exc: Exception, attempt: int) -> float:
    """Adaptive retry delay, especially for Google HTTP 429 throttling."""
    retry_after = _retry_after_header_seconds(exc)
    if retry_after is not None:
        return retry_after

    status, text = _detect_status(exc)
    base = max(1.0, float(CONFIG.get("retry_delay_sec", 2)))
    if status == 429 or "429" in text or "too many requests" in text or "rate limit" in text:
        return max(30.0, base * (2 ** attempt)) + random.uniform(2.0, 8.0)
    if status == 403 or "forbidden" in text:
        return max(15.0, base * (2 ** attempt)) + random.uniform(1.0, 5.0)
    if status and 500 <= int(status) < 600:
        return max(5.0, base * (2 ** attempt)) + random.uniform(0.5, 3.0)
    if "barderrorinfo" in text or "upstream rejected" in text:
        return max(10.0, base * (2 ** attempt)) + random.uniform(1.0, 5.0)
    return base * (attempt + 1) + random.uniform(0.2, 1.2)


def _get_ssl_ctx():
    global _ssl_ctx
    if _ssl_ctx is None:
        _ssl_ctx = ssl.create_default_context()
    return _ssl_ctx


def _get_httpx_client():
    global _httpx_client
    if _httpx_client is None and HAS_HTTPX:
        proxy = CONFIG.get("proxy")
        transport = httpx.HTTPTransport(proxy=proxy) if proxy else None
        _httpx_client = httpx.Client(transport=transport, timeout=CONFIG["request_timeout_sec"], verify=True)
    return _httpx_client


def get_account_pool() -> list:
    """Danh sách đường dẫn cookie file (nhiều tài khoản Google) để LUÂN PHIÊN khi
    1 tài khoản bị Google giới hạn quota (429) - xem CONFIG["cookie_files"]. Cho
    phép chạy khối lượng lớn (nhiều video/ngày) mà không phải chờ 1 tài khoản
    duy nhất hồi quota. Tương thích ngược: nếu chỉ có "cookie_file" (1 tài khoản,
    cấu hình cũ) hoặc không có cookie nào (anonymous) thì vẫn hoạt động bình thường.
    None trong danh sách nghĩa là "anonymous" (không cookie)."""
    files = CONFIG.get("cookie_files") or []
    files = [f for f in files if f]
    if files:
        return files
    single = CONFIG.get("cookie_file")
    return [single] if single else [None]


def _next_account(attempt: int) -> Optional[str]:
    """Chọn tài khoản (đường dẫn cookie file, hoặc None = anonymous) cho lần thử
    thứ `attempt` - LUÂN PHIÊN vòng tròn, BỎ QUA tài khoản đang trong thời gian
    cooldown (vừa bị 429/403) nếu còn tài khoản khác khả dụng. Nếu TẤT CẢ đều
    đang cooldown, vẫn trả về 1 tài khoản (ưu tiên tài khoản hết cooldown sớm
    nhất) thay vì chặn cứng - để _retry_wait_seconds phía trên xử lý việc chờ."""
    pool = get_account_pool()
    st = _account_pool_state
    now = time.time()
    available = [f for f in pool if now >= st["cooldown_until"].get(f, 0)]
    chosen_pool = available if available else pool
    idx = (st["idx"] + attempt) % len(chosen_pool)
    return chosen_pool[idx]


def _mark_account_cooldown(cookie_file: Optional[str], seconds: float):
    """Đánh dấu 1 tài khoản đang bị Google giới hạn (429) - tạm không dùng tới
    trong `seconds` giây tới, ưu tiên luân phiên sang tài khoản khác trong pool."""
    _account_pool_state["cooldown_until"][cookie_file] = time.time() + seconds
    log(f"Tài khoản '{cookie_file or 'anonymous'}' vào cooldown {seconds:.0f}s (429/403).")


def load_cookie(cookie_file: Optional[str] = None) -> tuple:
    """Load cookie từ 1 file cụ thể (hoặc CONFIG["cookie_file"] nếu không truyền
    - tương thích ngược), có cache riêng theo mtime CHO TỪNG FILE (hỗ trợ nhiều
    tài khoản cùng lúc mà không bị cache đè lẫn nhau)."""
    if cookie_file is None:
        cookie_file = CONFIG.get("cookie_file")
    if not cookie_file or not os.path.exists(cookie_file):
        return "", None
    cache_key = cookie_file
    cached = _cookie_cache.get(cache_key, {"str": "", "sapisid": None, "mtime": 0})
    try:
        mtime = os.path.getmtime(cookie_file)
        if mtime == cached["mtime"] and cached["str"]:
            return cached["str"], cached["sapisid"]
        with open(cookie_file, "r") as f:
            content = f.read().strip()
        if content.startswith("{"):
            data = json.loads(content)
            cookie_str = data.get("cookie", "")
            sapisid = data.get("sapisid", "")
        else:
            # Chuẩn hoá: nhiều extension/DevTools xuất cookie MỖI CẶP 1 DÒNG (có
            # xuống dòng), thay vì đúng 1 dòng "KEY=val; KEY2=val2" như HTTP cần.
            # Header HTTP KHÔNG được phép chứa \n/\r - nếu để nguyên sẽ bị chặn
            # NGAY TẠI MÁY (lỗi "Invalid header value"), chưa tới lượt Google từ
            # chối. Gộp lại thành 1 dòng dù người dùng dán theo định dạng nào.
            raw_pairs = [p.strip().rstrip(";").strip() for p in content.replace("\r", "\n").split("\n")]
            raw_pairs = [p for p in raw_pairs if p and "=" in p]
            cookie_str = "; ".join(raw_pairs)
            pairs = dict(p.split("=", 1) for p in raw_pairs)
            sapisid = pairs.get("SAPISID", "")
        _cookie_cache[cache_key] = {"str": cookie_str, "sapisid": sapisid or None, "mtime": mtime}
        return cookie_str, sapisid if sapisid else None
    except Exception as e:
        log(f"Cookie load error ({cookie_file}): {e}")
        return cached["str"], cached["sapisid"]


def make_sapisidhash(sapisid: str) -> str:
    ts = int(time.time())
    h = hashlib.sha1(f"{ts} {sapisid} https://gemini.google.com".encode()).hexdigest()
    return f"SAPISIDHASH {ts}_{h}"


def _account_prefix() -> str:
    """Return the Gemini account path prefix for non-default Google accounts."""
    auth_user = CONFIG.get("auth_user")
    if auth_user is None or auth_user == "":
        return ""
    return f"/u/{auth_user}"


def _build_headers(cookie_file: Optional[str] = None) -> dict:
    account_prefix = _account_prefix()
    headers = {
        "Content-Type": "application/x-www-form-urlencoded",
        "Origin": "https://gemini.google.com",
        "Referer": f"https://gemini.google.com{account_prefix}/app",
        "X-Same-Domain": "1",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    }
    if account_prefix:
        headers["X-Goog-AuthUser"] = str(CONFIG["auth_user"])
    cookie_str, sapisid = load_cookie(cookie_file)
    if cookie_str:
        headers["Cookie"] = cookie_str
    if sapisid:
        headers["Authorization"] = make_sapisidhash(sapisid)
    return headers


def _build_payload(prompt: str, model_id: int, think_mode: int, file_refs: list = None, extra_fields: dict = None) -> str:
    inner = [None] * 102
    if file_refs:
        refs = [[None, None, ref] for ref in file_refs]
        inner[0] = [prompt, 0, None, refs, None, None, 0]
    else:
        inner[0] = [prompt, 0, None, None, None, None, 0]
    inner[1] = ["en"]
    inner[2] = ["", "", "", None, None, None, None, None, None, ""]
    inner[6] = [0]
    inner[7] = 1
    inner[10] = 1
    inner[11] = 0
    inner[17] = [[think_mode]]
    inner[18] = 0
    inner[27] = 1
    inner[30] = [4]
    inner[41] = [2]
    inner[53] = 0
    inner[59] = str(uuid.uuid4())
    inner[61] = []
    inner[68] = 1
    inner[79] = model_id
    if extra_fields:
        for k, v in extra_fields.items():
            inner[k] = v
    outer = [None, json.dumps(inner)]
    params = {"f.req": json.dumps(outer)}
    if CONFIG.get("xsrf_token"):
        params["at"] = CONFIG["xsrf_token"]
    return urllib.parse.urlencode(params)


def _get_url() -> str:
    reqid = int(time.time()) % 1000000
    account_prefix = _account_prefix()
    return (
        f"https://gemini.google.com{account_prefix}/_/BardChatUi/data/"
        "assistant.lamda.BardFrontendService/StreamGenerate"
        f"?bl={CONFIG['gemini_bl']}&hl=en&_reqid={reqid}&rt=c"
    )


def clean_text(text: str, strip: bool = True) -> str:
    text = re.sub(
        r'```(?:python|javascript|text)\?code_(?:reference|stdout)&code_event_index=\d+\n.*?```\n?',
        '', text, flags=re.DOTALL
    )
    text = re.sub(r'http://googleusercontent\.com/card_content/\d+\n?', '', text)
    return text.strip() if strip else text


def _extract_texts_from_line(line: str) -> list:
    """Parse a single wrb.fr line and return list of text strings found."""
    if '"wrb.fr"' not in line or len(line) < 200:
        return []
    try:
        arr = json.loads(line)
        inner_str = arr[0][2]
        if not inner_str or len(inner_str) < 50:
            return []
        inner = json.loads(inner_str)
        if not (isinstance(inner, list) and len(inner) > 4 and inner[4]):
            return []
        texts = []
        for part in inner[4]:
            if isinstance(part, list) and len(part) > 1 and part[1] and isinstance(part[1], list):
                for t in part[1]:
                    if isinstance(t, str) and t:
                        texts.append(t)
        return texts
    except (json.JSONDecodeError, IndexError, TypeError):
        return []


def extract_response_text(raw: str) -> str:
    """Parse full response to get final text."""
    bard_err = re.search(r'BardErrorInfo\s*\[(\d+)\]', raw)
    if bard_err:
        raise RuntimeError(f"Gemini upstream rejected request: BardErrorInfo [{bard_err.group(1)}]")
    last_text = ""
    for line in raw.split("\n"):
        for t in _extract_texts_from_line(line):
            if len(t) > len(last_text):
                last_text = t
    return clean_text(last_text)


def generate(prompt: str, model_id: int, think_mode: int, file_refs: list = None, extra_fields: dict = None) -> str:
    """Non-streaming generation with retry - LUÂN PHIÊN qua nhiều tài khoản (nếu
    CONFIG["cookie_files"] có >1 file) khi gặp lỗi quota (429) hoặc 403, thay vì
    chỉ ngồi chờ trên 1 tài khoản duy nhất."""
    body = _build_payload(prompt, model_id, think_mode, file_refs, extra_fields).encode()
    url = _get_url()
    ctx = _get_ssl_ctx()
    proxy = CONFIG.get("proxy")
    pool = get_account_pool()
    total_attempts = max(CONFIG["retry_attempts"], len(pool)) if len(pool) > 1 else CONFIG["retry_attempts"]

    last_err = None
    for attempt in range(total_attempts):
        account = _next_account(attempt)
        headers = _build_headers(account)
        try:
            req = urllib.request.Request(url, data=body, headers=headers, method="POST")
            if proxy:
                opener = urllib.request.build_opener(
                    urllib.request.ProxyHandler({"http": proxy, "https": proxy}),
                    urllib.request.HTTPSHandler(context=ctx)
                )
                resp = opener.open(req, timeout=CONFIG["request_timeout_sec"])
            else:
                resp = urllib.request.urlopen(req, context=ctx, timeout=CONFIG["request_timeout_sec"])
            raw = resp.read().decode("utf-8", errors="replace")
            return extract_response_text(raw)
        except Exception as e:
            last_err = e
            if attempt < total_attempts - 1:
                if _is_quota_error(e):
                    wait = _retry_wait_seconds(e, attempt)
                    _mark_account_cooldown(account, wait)
                    # Còn tài khoản KHÁC chưa cooldown trong pool -> chuyển sang ngay,
                    # chỉ cần chờ ngắn (jitter) thay vì chờ đủ `wait` giây như khi chỉ
                    # có 1 tài khoản (không còn lựa chọn nào khác ngoài chờ hồi quota).
                    next_account = _next_account(attempt + 1)
                    if len(pool) > 1 and next_account != account:
                        wait = min(wait, random.uniform(1.0, 3.0))
                else:
                    wait = _retry_wait_seconds(e, attempt)
                log(f"Retry {attempt+1}/{total_attempts} (tài khoản: {account or 'anonymous'}) sau {wait:.1f}s: {e}")
                time.sleep(wait)
    raise last_err


def generate_stream(prompt: str, model_id: int, think_mode: int, file_refs: list = None, extra_fields: dict = None):
    """Streaming generation via httpx with retry on connection failure - cũng luân
    phiên tài khoản như generate() khi gặp lỗi quota."""
    if not HAS_HTTPX:
        text = generate(prompt, model_id, think_mode, file_refs, extra_fields)
        if text:
            yield text
        return

    body = _build_payload(prompt, model_id, think_mode, file_refs, extra_fields)
    url = _get_url()
    client = _get_httpx_client()
    pool = get_account_pool()
    total_attempts = max(CONFIG["retry_attempts"], len(pool)) if len(pool) > 1 else CONFIG["retry_attempts"]

    last_err = None
    emitted_raw_text = ""
    for attempt in range(total_attempts):
        account = _next_account(attempt)
        headers = _build_headers(account)
        try:
            with client.stream("POST", url, content=body, headers=headers) as resp:
                resp.raise_for_status()
                buf = ""
                for chunk in resp.iter_text():
                    buf += chunk
                    if "BardErrorInfo" in buf:
                        bard_err = re.search(r'BardErrorInfo\s*\[(\d+)\]', buf)
                        if bard_err:
                            raise RuntimeError(
                                f"Gemini upstream rejected request: BardErrorInfo [{bard_err.group(1)}]"
                            )
                    while "\n" in buf:
                        line, buf = buf.split("\n", 1)
                        for t in _extract_texts_from_line(line):
                            if t == emitted_raw_text or emitted_raw_text.startswith(t):
                                continue
                            if not t.startswith(emitted_raw_text):
                                raise RuntimeError("Gemini stream content changed during retry")
                            delta = clean_text(t[len(emitted_raw_text):], strip=False)
                            emitted_raw_text = t
                            if delta:
                                yield delta
            return
        except Exception as e:
            last_err = e
            if attempt < total_attempts - 1:
                if _is_quota_error(e):
                    wait = _retry_wait_seconds(e, attempt)
                    _mark_account_cooldown(account, wait)
                    next_account = _next_account(attempt + 1)
                    if len(pool) > 1 and next_account != account:
                        wait = min(wait, random.uniform(1.0, 3.0))
                else:
                    wait = _retry_wait_seconds(e, attempt)
                log(f"Stream retry {attempt+1}/{total_attempts} (tài khoản: {account or 'anonymous'}) sau {wait:.1f}s: {e}")
                time.sleep(wait)
    raise last_err
