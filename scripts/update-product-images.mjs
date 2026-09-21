// scripts/update-product-images.mjs
//
// Cap nhat hang loat field "image" + "images" trong src/data/products.ts,
// lay anh THAT tu thu muc ban da chuan bi san theo cau truc:
//
//   public/anh1/<sku-viet-thuong>/  (vd: public/anh1/dc89p/)
//     - chua 1 hoac nhieu anh cua dung SKU do (jpg/jpeg/png/webp)
//
// Script nay ghi de CA field "image" (Blob URL cu, dang hong) lan "images"
// bang duong dan noi bo /anh1/... - anh nam san trong repo, khong phu
// thuoc dich vu ngoai nao, khong ton phi/luot thao tac nao ca.
//
// CACH DUNG
//   node scripts/update-product-images.mjs --dry-run   # xem truoc
//   node scripts/update-product-images.mjs             # ghi that

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PRODUCTS_PATH = path.join(ROOT, "src/data/products.ts");
const BACKUP_PATH = path.join(ROOT, "src/data/products.ts.bak-local");
const IMAGES_ROOT = path.join(ROOT, "public/anh1");

const VALID_EXT = [".jpg", ".jpeg", ".png", ".webp"];

function naturalCompare(a, b) {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

function buildSkuToImageMap() {
  const map = new Map();
  if (!fs.existsSync(IMAGES_ROOT)) {
    console.error(`Khong tim thay thu muc ${IMAGES_ROOT}.`);
    process.exit(1);
  }
  const folders = fs.readdirSync(IMAGES_ROOT, { withFileTypes: true }).filter((d) => d.isDirectory());
  for (const folder of folders) {
    const folderPath = path.join(IMAGES_ROOT, folder.name);
    const files = fs
      .readdirSync(folderPath)
      .filter((f) => VALID_EXT.includes(path.extname(f).toLowerCase()))
      .sort(naturalCompare);
    if (files.length === 0) continue;
    map.set(folder.name.toLowerCase(), {
      publicPaths: files.map((f) => `/anh1/${folder.name}/${f}`),
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
  if (/(?<!s)image:\s*"(?:[^"\\]|\\.)*"/.test(blockText)) {
    return blockText.replace(/(?<!s)image:\s*"(?:[^"\\]|\\.)*"/, `image: "${newPath}"`);
  }
  return blockText.replace(/\n(  \},\n)$/, `\n    image: "${newPath}",\n$1`);
}

function setImagesField(blockText, paths) {
  const arrayLiteral = `images: [${paths.map((p) => `"${p}"`).join(", ")}]`;
  if (/images:\s*\[(?:[^\]]*)\]/.test(blockText)) {
    return blockText.replace(/images:\s*\[(?:[^\]]*)\]/, arrayLiteral);
  }
  if (/(?<!s)image:\s*"(?:[^"\\]|\\.)*",?\n/.test(blockText)) {
    return blockText.replace(
      /((?<!s)image:\s*"(?:[^"\\]|\\.)*",?\n)/,
      `$1    ${arrayLiteral},\n`
    );
  }
  return blockText.replace(/\n(  \},\n)$/, `\n    ${arrayLiteral},\n$1`);
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
    if (!sku) continue;

    const found = skuMap.get(sku.toLowerCase());
    if (!found) {
      skippedNoFolder++;
      continue;
    }

    let newBlockText = setImageField(block.text, found.publicPaths[0]);
    newBlockText = setImagesField(newBlockText, found.publicPaths);
    if (newBlockText === block.text) continue;

    matchedLog.push(`${sku} -> ${found.totalImages} anh (${found.publicPaths[0]})`);

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