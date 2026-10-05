// Danh sach duoi anh DUNG CHUNG cho trang admin (BlogForm - chay o trinh duyet)
// va src/lib/blog-image.ts (chay o server). File nay khong import gi tu Node
// nen dung duoc o ca hai noi. Muon them/bot duoi anh thi sua DUY NHAT o day.

const SUPPORTED = ["jpg", "jpeg", "jpe", "jfif", "png", "apng", "webp", "gif", "avif", "bmp", "svg"] as const;

export const SUPPORTED_IMAGE_EXTENSIONS: ReadonlySet<string> = new Set(SUPPORTED);
export const IMAGE_EXTENSIONS_LABEL = SUPPORTED.map((e) => "." + e).join(" ");

// Khop duoi anh o CUOI duong dan (bo phan ?query / #hash truoc khi kiem tra).
export const IMAGE_EXT_RE = new RegExp(`\\.(?:${SUPPORTED.join("|")})$`, "i");

export function stripQueryHash(p: string) {
  return p.split(/[?#]/)[0];
}

export function hasImageExtension(p: string) {
  return IMAGE_EXT_RE.test(stripQueryHash(p));
}

export type ImageCheck =
  | { ok: true; value: string | undefined; previewable: boolean }
  | { ok: false; message: string };

function explainBadExtension(ext: string): string {
  const ok = IMAGE_EXTENSIONS_LABEL;
  if (ext === "web") return `Đuôi ".web" không có — có thể bạn gõ thiếu chữ p? Đuôi đúng là ".webp". Đuôi dùng được: ${ok}.`;
  if (ext === "html" || ext === "htm")
    return `Đây là file trang web (.${ext}), không phải ảnh. Khi lưu ảnh từ Chrome, hãy chuột phải vào ảnh → "Lưu hình ảnh thành..." (Save image as), đừng chọn kiểu "Webpage, HTML only". Đuôi dùng được: ${ok}.`;
  if (ext === "heic" || ext === "heif")
    return `Ảnh .${ext} (iPhone) trình duyệt không hiển thị được. Hãy đổi sang .jpg / .png / .webp rồi nhập lại. Đuôi dùng được: ${ok}.`;
  if (ext === "tif" || ext === "tiff")
    return `Ảnh .${ext} trình duyệt không hiển thị được. Hãy đổi sang .jpg / .png / .webp rồi nhập lại. Đuôi dùng được: ${ok}.`;
  return `Đuôi ".${ext}" chưa dùng được cho ảnh trên web. Đuôi dùng được: ${ok}.`;
}

/**
 * Kiem tra + chuan hoa o "Thu muc hoac link anh".
 * - Rong                       -> ok, khong co anh (dung bieu tuong).
 * - "\" kieu Windows           -> doi thanh "/".
 * - Link https://...           -> giu nguyen (duoi la hoac khong co duoi deu duoc, vd Vercel Blob).
 * - Duong dan co duoi anh      -> tu them "/" o dau neu thieu (thieu "/" la loi pho bien).
 * - Duong dan KHONG co duoi    -> coi la THU MUC (he thong tu lay anh dau tien).
 * - Duong dan co duoi khong phai anh (.html, .heic, .web...) -> bao loi ro rang.
 */
export function checkImageInput(input?: string): ImageCheck {
  const raw = (input ?? "").trim().replace(/\\/g, "/");
  if (!raw) return { ok: true, value: undefined, previewable: false };

  if (/^https?:\/\//i.test(raw)) {
    let pathname = "";
    try {
      pathname = new URL(raw).pathname;
    } catch {
      return { ok: false, message: "Link ảnh không hợp lệ. Hãy dán lại đầy đủ, bắt đầu bằng https://" };
    }
    const last = pathname.split("/").filter(Boolean).pop() ?? "";
    const dot = last.lastIndexOf(".");
    const ext = dot > 0 ? last.slice(dot + 1).toLowerCase() : "";
    if (ext && !SUPPORTED_IMAGE_EXTENSIONS.has(ext)) return { ok: false, message: explainBadExtension(ext) };
    return { ok: true, value: raw, previewable: true };
  }

  const path = stripQueryHash(raw);
  const last = path.split("/").filter(Boolean).pop() ?? "";
  const dot = last.lastIndexOf(".");
  const ext = dot > 0 ? last.slice(dot + 1).toLowerCase() : "";

  if (!ext) {
    // Thu muc: he thong se tu tim anh dau tien trong public/<thu-muc>
    return { ok: true, value: raw.replace(/^\/+/, "/").replace(/^(?!\/)/, "/"), previewable: false };
  }
  if (!SUPPORTED_IMAGE_EXTENSIONS.has(ext)) return { ok: false, message: explainBadExtension(ext) };
  return { ok: true, value: "/" + path.replace(/^\/+/, ""), previewable: true };
}
