// Tim toan bo dong `image: "https://vipsextoy.net/..."` trong products.ts,
// tai anh do ve public/anh1/legacy-<id>/1.<ext>, roi doi duong dan trong
// products.ts sang duong dan local (vd "/anh1/legacy-2722/1.jpg").
//
// Chay: node scripts/localize-net-images.mjs
// Chay thu truoc (khong ghi file, chi xem se doi gi): node scripts/localize-net-images.mjs --dry-run

import fs from "node:fs";
import path from "node:path";

const FILE = path.resolve("src/data/products.ts");
const DRY_RUN = process.argv.includes("--dry-run");

const PATTERN = /image:\s*"(https:\/\/vipsextoy\.net\/files\/sanpham\/(\d+)\/1\.(\w+))"/g;

async function downloadImage(url, destPath) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} khi tai ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  fs.writeFileSync(destPath, buf);
  return buf.length;
}

async function main() {
  let content = fs.readFileSync(FILE, "utf8");
  const matches = [...content.matchAll(PATTERN)];

  if (matches.length === 0) {
    console.log("Khong con anh nao tro sang vipsextoy.net.");
    return;
  }

  console.log(`Tim thay ${matches.length} anh can tai ve.\n`);

  const replacements = [];
  for (const m of matches) {
    const [full, url, id, ext] = m;
    const localPath = `/anh1/legacy-${id}/1.${ext}`;
    const destOnDisk = path.resolve("public" + localPath);

    if (DRY_RUN) {
      console.log(`[dry-run] ${url} -> ${localPath}`);
      continue;
    }

    if (fs.existsSync(destOnDisk)) {
      console.log(`Da co san, bo qua tai lai: ${localPath}`);
    } else {
      try {
        const size = await downloadImage(url, destOnDisk);
        console.log(`OK  ${url} -> ${localPath}  (${(size / 1024).toFixed(1)} KiB)`);
      } catch (err) {
        console.error(`LOI ${url}: ${err.message}`);
        continue; // giu nguyen URL cu neu tai loi, khong doi duong dan
      }
    }

    replacements.push([full, `image: "${localPath}"`]);
  }

  if (DRY_RUN) {
    console.log("\nDay la dry-run, chua ghi gi vao products.ts.");
    return;
  }

  for (const [oldStr, newStr] of replacements) {
    content = content.replace(oldStr, newStr);
  }

  fs.writeFileSync(FILE, content, "utf8");
  console.log(`\nDa cap nhat ${replacements.length} dong trong ${FILE}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
