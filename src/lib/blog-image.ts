import fs from "node:fs";
import path from "node:path";
import { IMAGE_EXT_RE, hasImageExtension } from "./image-ext";

// Duoi anh hop le (jpg, jpeg, png, webp, gif, avif, bmp, svg...) khai bao o
// src/lib/image-ext.ts - sua o do de ap dung cho ca form admin va server.
const IMAGE_EXT = IMAGE_EXT_RE;

/**
 * Resolve field image:
 * - /anhblog/abc/01.jpg -> giữ nguyên
 * - /anhblog/abc -> tìm ảnh đầu tiên trong folder
 * - /anhblog/abc/ -> tìm ảnh đầu tiên trong folder
 */
export function resolveBlogImage(image?: string): string | undefined {
  if (!image) return undefined;

  // Windows dung dau "\" de ngan cach thu muc (vd khi copy duong dan tu File
  // Explorer), nhung server chay tren Linux (Vercel) khong hieu "\" la dau
  // ngan cach thu muc - no coi ca chuoi la 1 ten file ky la, nen tim mai
  // khong ra. Doi het "\" sang "/" truoc, de go kieu nao cung duoc.
  const trimmed = image.trim().replace(/\\/g, "/");
  if (!trimmed) return undefined;

  // Link day du (https://...): giu nguyen, khong tim trong thu muc public.
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  // Đã là đường dẫn tới file ảnh cụ thể (chap nhan ca "?v=2" phia sau duoi file).
  // Thieu "/" o dau thi tu them, neu khong trinh duyet hieu thanh duong dan tuong doi va vo anh.
  if (hasImageExtension(trimmed)) {
    return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  }

  try {
    const relFolder = trimmed
      .replace(/^\/+/, "")
      .replace(/\/+$/, "");

    if (!relFolder) return undefined;

    const folderFsPath = path.join(
      process.cwd(),
      "public",
      relFolder
    );

    if (!fs.existsSync(folderFsPath)) {
      return undefined;
    }

    if (!fs.statSync(folderFsPath).isDirectory()) {
      return undefined;
    }

    const files = fs
      .readdirSync(folderFsPath, { withFileTypes: true })
      .filter(
        (entry) =>
          entry.isFile() && IMAGE_EXT.test(entry.name)
      )
      .map((entry) => entry.name)
      .sort((a, b) =>
        a.localeCompare(b, "vi", {
          numeric: true,
          sensitivity: "base",
        })
      );

    if (files.length === 0) {
      return undefined;
    }

    return `/${relFolder}/${files[0]}`;
  } catch {
    return undefined;
  }
}

/**
 * Chuẩn hóa giá trị image từ form/API.
 *
 * Nếu nhập:
 *   /anhblog/abc/01.jpg
 * -> giữ nguyên.
 *
 * Nếu nhập:
 *   /anhblog/abc
 * hoặc:
 *   /anhblog/abc/
 * hoặc (kiểu Windows):
 *   anhblog\abc
 * -> tự tìm ảnh đầu tiên trong folder và lưu thành
 *    /anhblog/abc/01.jpg
 *
 * Nếu không tìm được ảnh:
 * -> trả undefined.
 */
export function normalizeBlogImageInput(
  image?: string
): string | undefined {
  return resolveBlogImage(image);
}
