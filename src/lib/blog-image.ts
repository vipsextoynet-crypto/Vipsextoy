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
// Dung khi LUU bai viet (trong cac API route admin/blog) - CHUAN HOA chuoi
// nguoi dung nhap vao truoc khi ghi xuong data/blog.ts, KHONG doc filesystem
// (khac voi resolveBlogImage o duoi, chi dung luc RENDER trang blog).
// Muc dich: sua loi thieu dau "/" o dau (vd nhap "anhblog/abc" se tu thanh
// "/anhblog/abc"), bo khoang trang thua, doi "\" thanh "/", va cat bo phan
// "...public/" neu lo dan ca duong dan may local vao.
export function normalizeBlogImageInput(image?: string): string | undefined {
  if (!image) return undefined;
  let trimmed = image.trim();
  if (!trimmed) return undefined;

  trimmed = trimmed.replace(/\\/g, "/");
  const publicIdx = trimmed.toLowerCase().lastIndexOf("/public/");
  if (publicIdx !== -1) {
    trimmed = trimmed.slice(publicIdx + "/public/".length);
  }
  if (!trimmed.startsWith("/")) trimmed = "/" + trimmed;

  // Bo dau "/" thua lien tiep (vd lo nhap "//anhblog/abc")
  trimmed = trimmed.replace(/\/{2,}/g, "/");

  return trimmed;
}

export function resolveBlogImage(image?: string): string | undefined {
  if (!image) return undefined;
  let trimmed = image.trim();
  if (!trimmed) return undefined;

  // Tha thu lo go nham duong dan Windows (vd "G:\vipextoy\public\anhblog\abc"):
  // doi \ thanh /, roi neu co doan ".../public/..." thi chi giu phan SAU no.
  trimmed = trimmed.replace(/\\/g, "/");
  const publicIdx = trimmed.toLowerCase().lastIndexOf("/public/");
  if (publicIdx !== -1) {
    trimmed = trimmed.slice(publicIdx + "/public/".length);
  }
  if (!trimmed.startsWith("/")) trimmed = "/" + trimmed;

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
