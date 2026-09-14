// scripts/update-product-images.mjs
//
// Cap nhat hang loat field "image" trong src/data/products.ts, lay anh THAT
// tu thu muc ban da chuan bi san theo cau truc:
//
//   public/anh/<sku-viet-thuong>/  (vd: public/anh/dc89p/)
//     - chua 1 hoac nhieu anh cua dung SKU do (jpg/jpeg/png/webp)
//
// Cach hoat dong:
// - Script quet toan bo thu muc con trong public/anh/
// - Voi moi SKU trong products.ts, tim thu muc trung ten (KHONG phan biet
//   hoa/thuong - vi Windows va Linux/Vercel xu ly khac nhau, script tu
//   chuan hoa ve chu thuong de khop chinh xac)
// - Neu thu muc co NHIEU anh, LAY ANH DAU TIEN (theo thu tu ten file) lam
//   anh dai dien "image" cho san pham (schema hien tai chi co 1 anh/san
//   pham). Cac anh con lai trong thu muc KHONG bi xoa, van nam san neu sau
//   nay ban muon lam thu vien anh (gallery) nhieu anh/san pham.
// - SKU nao KHONG co thu muc tuong ung se bi BO QUA (giu nguyen anh cu,
//   khong xoa gi ca) - an toan, chay lai bao nhieu lan cung duoc.
//
// CACH DUNG
// ---------
// 1) Chuan bi xong thu muc public/anh/<sku>/... voi it nhat 1 anh moi SKU.
// 2) Chay thu truoc voi che do XEM TRUOC (khong ghi gi ca, chi in ra man
//    hinh se doi gi):
//      node scripts/update-product-images.mjs --dry-run
// 3) Ung y thi chay that:
//      node scripts/update-product-images.mjs
//
// AN TOAN DU LIEU: tu dong sao luu ban goc thanh products.ts.bak-images
// TRUOC KHI ghi de (neu file .bak nay chua ton tai).

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PRODUCTS_PATH = path.join(ROOT, "src/data/products.ts");
const BACKUP_PATH = path.join(ROOT, "src/data/products.ts.bak-images");
const IMAGES_ROOT = path.join(ROOT, "public/anh");

const VALID_EXT = [".jpg", ".jpeg", ".png", ".webp"];

function buildSkuToImageMap() {
  const map = new Map(); // sku viet thuong -> duong dan public "/anh/<folder>/<file>"
  if (!fs.existsSync(IMAGES_ROOT)) {
    console.error(`Khong tim thay thu muc ${IMAGES_ROOT}. Tao thu muc nay va bo anh vao truoc.`);
    process.exit(1);
  }
  const folders = fs.readdirSync(IMAGES_ROOT, { withFileTypes: true }).filter((d) => d.isDirectory());
  for (const folder of folders) {
    const folderPath = path.join(IMAGES_ROOT, folder.name);
    const files = fs
      .readdirSync(folderPath)
      .filter((f) => VALID_EXT.includes(path.extname(f).toLowerCase()))
      .sort();
    if (files.length === 0) continue;
    const chosen = files[0];
    map.set(folder.name.toLowerCase(), {
      publicPath: `/anh/${folder.name}/${chosen}`,
      totalImages: files.length,
    });
  }
  return map;
}

function splitProductBlocks(source) {
  const blocks = [];
  const regex = /  \{\n(?:.*\n)*?  \},\n/g;
  let match;
  while ((match = regex.exec(source)) !== null) {
    blocks.push({ text: match[0], start: match.index, end: regex.lastIndex });
  }
  return blocks;
}

function extractField(blockText, field) {
  const re = new RegExp(`${field}:\\s*"((?:[^"\\\\]|\\\\.)*)"`);
  const m = blockText.match(re);
  return m ? m[1].replace(/\\"/g, '"') : null;
}

function setImageField(blockText, newPath) {
  if (/image:\s*"(?:[^"\\]|\\.)*"/.test(blockText)) {
    return blockText.replace(/image:\s*"(?:[^"\\]|\\.)*"/, `image: "${newPath}"`);
  }
  // Chua co field image (hiem khi xay ra) -> them vao truoc dau "},\n" cuoi block
  return blockText.replace(/\n(  \},\n)$/, `\n    image: "${newPath}",\n$1`);
}

function main() {
  const dryRun = process.argv.includes("--dry-run");
  const skuMap = buildSkuToImageMap();
  console.log(`Tim thay anh cho ${skuMap.size} SKU trong ${IMAGES_ROOT}`);

  let source = fs.readFileSync(PRODUCTS_PATH, "utf8");
  const blocks = splitProductBlocks(source);

  let offsetShift = 0;
  let updated = 0;
  let skippedNoFolder = 0;

  const matchedLog = [];

  for (const block of blocks) {
    const sku = extractField(block.text, "sku");
    if (!sku) continue; // block danh muc, khong phai san pham

    const found = skuMap.get(sku.toLowerCase());
    if (!found) {
      skippedNoFolder++;
      continue;
    }

    const newBlockText = setImageField(block.text, found.publicPath);
    if (newBlockText === block.text) continue; // khong doi gi (da dung roi)

    matchedLog.push(
      `${sku} -> ${found.publicPath}${found.totalImages > 1 ? ` (co ${found.totalImages} anh, dang dung anh dau tien)` : ""}`
    );

    if (!dryRun) {
      const realStart = block.start + offsetShift;
      const realEnd = block.end + offsetShift;
      source = source.slice(0, realStart) + newBlockText + source.slice(realEnd);
      offsetShift += newBlockText.length - block.text.length;
    }
    updated++;
  }

  console.log(`\n${dryRun ? "[XEM TRUOC - CHUA GHI GI]" : "Da cap nhat:"} ${updated} san pham`);
  matchedLog.slice(0, 30).forEach((l) => console.log("  " + l));
  if (matchedLog.length > 30) console.log(`  ... va ${matchedLog.length - 30} san pham khac`);
  console.log(`SKU khong co thu muc anh tuong ung (bo qua, giu nguyen): ${skippedNoFolder}`);

  if (!dryRun && updated > 0) {
    if (!fs.existsSync(BACKUP_PATH)) {
      fs.copyFileSync(PRODUCTS_PATH, BACKUP_PATH);
      console.log(`\nDa sao luu ban truoc khi sua vao ${BACKUP_PATH}`);
    }
    fs.writeFileSync(PRODUCTS_PATH, source, "utf8");
    console.log("Da ghi vao src/data/products.ts");
  } else if (dryRun) {
    console.log("\nChay lai KHONG co --dry-run de ghi that vao file.");
  }
}

main();
