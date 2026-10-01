// scripts/check-longdesc-status.mjs
//
// Kiem tra nhanh trang thai field longDescription tren toan bo products.ts:
//   - Bao nhieu san pham CHUA co longDescription (can chay
//     generate-product-details.mjs truoc)
//   - Trong so da co, bao nhieu la HTML (da nang cap), bao nhieu van la
//     text thuong (can chay rewrite-long-descriptions.mjs de nang cap)

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FILE_PATH = path.join(ROOT, "src/data/products.ts");

const content = fs.readFileSync(FILE_PATH, "utf8");

const totalSku = (content.match(/    sku: "/g) || []).length;

const descRegex = /longDescription:\s*`([\s\S]*?)`,/g;
let m;
let withField = 0;
let htmlCount = 0;
let textCount = 0;
const textSamples = [];
const missingSamples = [];

const slugMatches = [...content.matchAll(/  \{\n    slug: "([^"]+)"/g)];
const blocks = slugMatches.map((mm, i) => {
  const start = mm.index;
  const end = i + 1 < slugMatches.length ? slugMatches[i + 1].index : content.length;
  return { slug: mm[1], text: content.slice(start, end) };
});

for (const block of blocks) {
  if (!/sku:\s*"/.test(block.text)) continue; // bo qua object khong phai san pham
  const d = block.text.match(/longDescription:\s*`([\s\S]*?)`,/);
  if (!d) {
    if (missingSamples.length < 5) missingSamples.push(block.slug);
    continue;
  }
  withField++;
  if (/^\s*</.test(d[1])) {
    htmlCount++;
  } else {
    textCount++;
    if (textSamples.length < 5) textSamples.push(block.slug);
  }
}

console.log(`Tong san pham: ${totalSku}`);
console.log(`Co longDescription: ${withField}`);
console.log(`  - Da la HTML (co H2/H3): ${htmlCount}`);
console.log(`  - Van la text thuong (chua nang cap): ${textCount}`);
console.log(`CHUA co longDescription (chua chay generate-product-details.mjs): ${totalSku - withField}`);

if (missingSamples.length > 0) {
  console.log(`\nMau vai SKU CHUA co longDescription:`);
  missingSamples.forEach((s) => console.log("  - " + s));
}
if (textSamples.length > 0) {
  console.log(`\nMau vai SKU van la TEXT THUONG (chua nang cap HTML):`);
  textSamples.forEach((s) => console.log("  - " + s));
}
