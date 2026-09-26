// Chi dung trong Server Component (khong "use client") - blog list va blog
// detail deu la trang tinh (SSG, co generateStaticParams / khong co "use
// client"), nen ham nay chay luc `next build` tren may build cua Vercel -
// luc do co day du filesystem cua repo, doc duoc thu muc trong public/ binh
// thuong (khac voi luc chay trong serverless function o runtime, khi public/
// khong chac chan con nguyen).

import fs from "node:fs";
import path from "node:path";

const IMAGE_EXT = /\.(jpe?g|png|webp|gif|avif)$/i;

// Nhan vao gia tri field "image" cua bai viet - co the la:
//  - Duong dan file anh cu the (vd "/anhblog/abc/01.jpg") -> giu nguyen.
//  - Duong dan thu muc (vd "/anhblog/abc" hoac "/anhblog/abc/") -> tu tim
//    anh dau tien trong thu muc do (sap xep theo ten, so truoc chu neu co).
// Tra ve undefined neu khong tim thay gi ca (component goi se tu fallback
// sang icon).
export function resolveBlogImage(image?: string): string | undefined {
  if (!image) return undefined;
  const trimmed = image.trim();
  if (!trimmed) return undefined;

  if (IMAGE_EXT.test(trimmed)) return trimmed;

  try {
    const relFolder = trimmed.replace(/^\/+/, "").replace(/\/+$/, "");
    const folderFsPath = path.join(process.cwd(), "public", relFolder);

    const files = fs
      .readdirSync(folderFsPath)
      .filter((f) => IMAGE_EXT.test(f))
      .sort((a, b) => a.localeCompare(b, "vi", { numeric: true }));

    if (files.length === 0) return undefined;
    return `/${relFolder}/${files[0]}`;
  } catch {
    return undefined;
  }
}
