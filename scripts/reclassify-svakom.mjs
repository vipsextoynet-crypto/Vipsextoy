// scripts/reclassify-svakom.mjs
//
// 1) Doi ten category "Chua phan loai" -> "San Pham Khac" (ca trong mang
//    categories va trong tung san pham dang gan category do).
// 2) Chuyen 15 san pham dang o category "Svakom" sang cac category dung
//    hon theo dung bang da duyet (SKU -> categorySlug moi).
// 3) Xoa object "Svakom" khoi mang categories.
//
// An toan: luon sao luu 1 lan truoc khi ghi, chi ghi khi khong co --dry-run.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FILE_PATH = path.join(ROOT, "src/data/products.ts");
const isDry = process.argv.includes("--dry-run");

// SKU -> { categorySlug, category (ten hien thi) } - da duyet
const REASSIGN = {
  DC93P:  { slug: "duong-vat-gia-rung", name: "Dương Vật Giả Rung" },
  AD80:   { slug: "duong-vat-gia-rung", name: "Dương Vật Giả Rung" },
  AD80A:  { slug: "duong-vat-gia-rung", name: "Dương Vật Giả Rung" },
  AD80B:  { slug: "duong-vat-gia-rung", name: "Dương Vật Giả Rung" },
  AD80C:  { slug: "duong-vat-gia-rung", name: "Dương Vật Giả Rung" },
  AD80G:  { slug: "duong-vat-gia-rung", name: "Dương Vật Giả Rung" },
  DC90CP: { slug: "duong-vat-gia-rung", name: "Dương Vật Giả Rung" },
  DC90M:  { slug: "duong-vat-gia-rung", name: "Dương Vật Giả Rung" },
  DC90K:  { slug: "duong-vat-gia-rung", name: "Dương Vật Giả Rung" },
  DC90G:  { slug: "duong-vat-gia-rung", name: "Dương Vật Giả Rung" },
  DC90:   { slug: "duong-vat-gia-rung", name: "Dương Vật Giả Rung" },
  DC89V:  { slug: "do-choi-hau-mon",    name: "Đồ Chơi Hậu Môn" },
  DC89M:  { slug: "do-choi-hau-mon",    name: "Đồ Chơi Hậu Môn" },
  DC90VP: { slug: "trung-rung-tinh-yeu", name: "Trứng Rung Tình Yêu" },
  VS02:   { slug: "gel-boi-tron-cao-cap", name: "Gel Bôi Trơn Cao Cấp" },
};

function splitProductBlocks(source) {
  const slugMatches = [...source.matchAll(/  \{\n    slug: "([^"]+)"/g)];
  return slugMatches.map((m, i) => {
    const start = m.index;
    const end = i + 1 < slugMatches.length ? slugMatches[i + 1].index : source.length;
    return { slug: m[1], start, end, text: source.slice(start, end) };
  });
}

let source = fs.readFileSync(FILE_PATH, "utf8");

// ---------- 1) Doi ten "Chua phan loai" -> "San Pham Khac" ----------
const oldName = "Chưa phân loại";
const newName = "Sản Phẩm Khác";

let renameCount = 0;
source = source.replace(
  new RegExp(`(slug:\\s*"chua-phan-loai",\\s*\\n\\s*name:\\s*")${oldName}(")`),
  (full, pre, post) => {
    renameCount = 1;
    return `${pre}${newName}${post}`;
  }
);
const productRenameMatches = source.match(new RegExp(`category:\\s*"${oldName}"`, "g")) || [];
source = source.replaceAll(`category: "${oldName}"`, `category: "${newName}"`);

// ---------- 2) Gan lai category cho 15 san pham Svakom ----------
const blocks = splitProductBlocks(source);
let offsetShift = 0;
let reassignCount = 0;
const reassignLog = [];

for (const block of blocks) {
  const skuMatch = block.text.match(/sku:\s*"([^"]+)"/);
  const sku = skuMatch ? skuMatch[1] : null;
  const target = sku ? REASSIGN[sku] : null;
  if (!target) continue;

  const currentCatSlugMatch = block.text.match(/categorySlug:\s*"([^"]+)"/);
  if (!currentCatSlugMatch || currentCatSlugMatch[1] !== "svakom") continue;

  let newBlockText = block.text.replace(
    /categorySlug:\s*"svakom"/,
    `categorySlug: "${target.slug}"`
  );
  newBlockText = newBlockText.replace(
    /category:\s*"Svakom"/,
    `category: "${target.name}"`
  );

  if (newBlockText === block.text) continue;

  const realStart = block.start + offsetShift;
  const realEnd = block.end + offsetShift;
  source = source.slice(0, realStart) + newBlockText + source.slice(realEnd);
  offsetShift += newBlockText.length - block.text.length;

  reassignCount++;
  reassignLog.push(`${sku} -> ${target.slug} (${target.name})`);
}

// ---------- 3) Xoa object "Svakom" khoi mang categories ----------
const svakomObjRegex = /\s*\{\n\s*slug:\s*"svakom",\n(?:.*\n)*?\s*\},\n/;
const hadSvakomCategory = svakomObjRegex.test(source);
source = source.replace(svakomObjRegex, "\n");

// ---------- Bao cao ----------
console.log(`1) Doi ten category "chua-phan-loai": ${renameCount ? "OK" : "KHONG THAY (kiem tra lai)"}`);
console.log(`   Doi field category cua san pham: ${productRenameMatches.length} san pham.`);
console.log(`2) Gan lai category cho san pham Svakom: ${reassignCount}/${Object.keys(REASSIGN).length} san pham.`);
reassignLog.forEach((l) => console.log("   - " + l));
if (reassignCount !== Object.keys(REASSIGN).length) {
  console.log("   !! CANH BAO: so luong khong khop 15 SKU du kien, kiem tra lai truoc khi ghi.");
}
console.log(`3) Xoa object category "Svakom": ${hadSvakomCategory ? "OK" : "KHONG THAY (co the da bi xoa truoc do)"}`);

const remainingSvakomProducts = (source.match(/categorySlug:\s*"svakom"/g) || []).length;
console.log(`\nKiem tra con lai: ${remainingSvakomProducts} san pham van con categorySlug "svakom" (phai la 0).`);

if (isDry) {
  console.log("\n[--dry-run] Chua ghi gi vao file.");
} else {
  const backupPath = FILE_PATH + ".backup-reclassify-" + Date.now();
  fs.copyFileSync(FILE_PATH, backupPath);
  fs.writeFileSync(FILE_PATH, source, "utf8");
  console.log(`\nDa sao luu ban goc: ${backupPath}`);
  console.log(`Da ghi vao ${FILE_PATH}`);
}