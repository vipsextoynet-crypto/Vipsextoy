// scripts/extract-source-categories.mjs
//
// KHONG GOI MANG. Doc lai cac file HTML da luu san trong
// public/anh1/_debug/*.html (tu luc chay download_product.py voi
// SAVE_DEBUG_HTML = True), lay ra:
//   - SKU cua san pham (dung lai dung cach extract_product_code() trong
//     download_product.py: "Ma san pham:", "Ma so:", "SKU:"...)
//   - Breadcrumb / danh muc thuc te tren vipsextoy.net (thu nhieu kieu
//     selector pho bien, in ra ngay 5 mau dau de kiem tra co dung khong
//     TRUOC KHI ghi ca 1900 dong).
//
// Ket qua: scripts/source-categories.csv (SKU, breadcrumb, url)
//
// CACH DUNG
//   node scripts/extract-source-categories.mjs --sample     # chi in 10 mau, KHONG ghi file
//   node scripts/extract-source-categories.mjs              # ghi het ra csv

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEBUG_DIR = path.join(ROOT, "public/anh1/_debug");
const OUT_CSV = path.join(ROOT, "scripts/source-categories.csv");
const isSample = process.argv.includes("--sample");

if (!fs.existsSync(DEBUG_DIR)) {
  console.error(`Khong tim thay ${DEBUG_DIR}. Ban co chay download_product.py voi SAVE_DEBUG_HTML=True chua?`);
  process.exit(1);
}

function extractUrl(html) {
  const m = html.match(/<!-- URL:\s*(.*?)\s*-->/);
  return m ? m[1] : null;
}

function isProductPage(html) {
  return html.includes('id="anh_chitiet_sanpham"') || /class="[^"]*\bhtml201\b[^"]*\bdtct\b[^"]*"/.test(html) || /class="[^"]*\bdtct\b[^"]*\bhtml201\b[^"]*"/.test(html);
}

function extractSku(html) {
  const patterns = [
    /Mã\s*số\s*[:：]\s*<[^>]*>?\s*([A-Za-z0-9._-]+)/i,
    /Mã\s*sản\s*phẩm\s*[:：]\s*<[^>]*>?\s*([A-Za-z0-9._-]+)/i,
    /Mã\s*SP\s*[:：]\s*<[^>]*>?\s*([A-Za-z0-9._-]+)/i,
    /SKU\s*[:：]\s*<[^>]*>?\s*([A-Za-z0-9._-]+)/i,
  ];
  // Thu tren text da bo tag truoc (an toan hon), roi tren raw html.
  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  const textPatterns = [
    /Mã\s*số\s*[:：]\s*([A-Za-z0-9._-]+)/i,
    /Mã\s*sản\s*phẩm\s*[:：]\s*([A-Za-z0-9._-]+)/i,
    /Mã\s*SP\s*[:：]\s*([A-Za-z0-9._-]+)/i,
    /SKU\s*[:：]\s*([A-Za-z0-9._-]+)/i,
  ];
  for (const p of textPatterns) {
    const m = text.match(p);
    if (m) return m[1].trim();
  }
  for (const p of patterns) {
    const m = html.match(p);
    if (m) return m[1].trim();
  }
  const m2 = html.match(/files\/sanpham\/(\d+)\//i);
  if (m2) return m2[1];
  return null;
}

// Class THAT tren vipsextoy.net la "thanh_dinh_huong". Day KHONG PHAI 1
// duong dan phan cap don le - day la danh sach TAT CA danh muc (nhom
// va/hoac danh muc con) ma san pham nay dang duoc gan vao cung luc.
// Tra ve mang { name, slug } theo dung thu tu xuat hien, bo qua "Trang chu".
function extractCategoryTags(html) {
  const m = html.match(/class="thanh_dinh_huong"[^>]*>([\s\S]*?)<\/div>/i);
  if (!m) return null;
  const inner = m[1];
  const links = [...inner.matchAll(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi)]
    .map((x) => ({
      slug: x[1].replace(/^\.?\/?/, "").replace(/\/$/, "").trim(),
      name: x[2].replace(/<[^>]+>/g, "").trim(),
    }))
    .filter((x) => x.name && !/trang\s*chủ/i.test(x.name));
  return links.length > 0 ? links : null;
}

const files = fs.readdirSync(DEBUG_DIR).filter((f) => f.endsWith(".html"));
console.log(`Tim thay ${files.length} file HTML da luu san trong ${DEBUG_DIR}\n`);

const rows = [];
let productPages = 0;
let withSku = 0;
let withBreadcrumb = 0;

for (const f of files) {
  const html = fs.readFileSync(path.join(DEBUG_DIR, f), "utf8");
  if (!isProductPage(html)) continue;
  productPages++;

  const url = extractUrl(html);
  const sku = extractSku(html);
  const tags = extractCategoryTags(html);

  if (sku) withSku++;
  if (tags) withBreadcrumb++;

  rows.push({ sku, tags, url });

  if (isSample && rows.length <= 10) {
    console.log(`--- ${f} ---`);
    console.log("URL:", url);
    console.log("SKU:", sku ?? "(khong tim thay)");
    console.log(
      "Cac danh muc duoc gan:",
      tags ? tags.map((t) => `${t.name} [${t.slug}]`).join("  |  ") : "(khong tim thay)"
    );
    console.log("");
  }
}

console.log(`\nTong file la trang san pham: ${productPages}`);
console.log(`Tim duoc SKU: ${withSku}`);
console.log(`Tim duoc breadcrumb: ${withBreadcrumb}`);

if (withBreadcrumb === 0) {
  console.log(
    "\n!! KHONG tim duoc breadcrumb nao voi cac mau selector hien co.\n" +
    "   Mo 1 file bat ky trong public/anh1/_debug/ bang Notepad, tim doan\n" +
    "   HTML chua ten danh muc (vd 'Dương Vật Giả Rung') gan dau trang,\n" +
    "   copy khoang 3-4 dong xung quanh do gui lai de minh sua dung selector."
  );
}

if (!isSample) {
  const header = "sku,tags,url\n";
  const body = rows
    .map((r) => {
      const tagsStr = r.tags ? r.tags.map((t) => `${t.name}[${t.slug}]`).join(" | ") : "";
      const esc = (s) => `"${(s ?? "").replace(/"/g, '""')}"`;
      return [esc(r.sku), esc(tagsStr), esc(r.url)].join(",");
    })
    .join("\n");
  fs.writeFileSync(OUT_CSV, "\uFEFF" + header + body, "utf8");
  console.log(`\nDa ghi ${rows.length} dong vao ${OUT_CSV}`);
} else {
  console.log("\n[--sample] Chua ghi file CSV, chi in mau de kiem tra selector.");
}
