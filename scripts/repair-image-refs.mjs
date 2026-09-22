// scripts/repair-image-refs.mjs
//
// Soat toan bo san pham trong products.ts, doi chieu tung anh trong "image"
// va "images" voi DANH SACH FILE THAT SU DA COMMIT LEN GIT (dung "git
// ls-files", vi day moi la thu se thuc su co tren Vercel - khong dung
// fs.readdirSync vi Windows khong phan biet hoa/thuong con Linux thi co,
// va vi tren dia co the co file chua commit hoac thieu file da commit).
//
// Voi moi san pham dung /anh1/<SKU>/...:
//   - Bo (khoi mang images) nhung file KHONG co that tren Git.
//   - Neu anh chinh (image) bi hong -> thay bang anh dau tien con hop le
//     (uu tien trong images[] con lai, khong co thi lay bat ky file that
//     nao dang co trong thu muc /anh1/<SKU>/ tren Git).
//   - Neu sau khi don, san pham KHONG CON anh nao hop le -> KHONG tu bia,
//     chi liet ke ra de ban bo sung anh thu cong.
//
// CACH DUNG (trong G:\vipextoy)
//   node scripts/repair-image-refs.mjs --dry-run   # xem truoc, KHONG sua gi
//   node scripts/repair-image-refs.mjs             # sua products.ts o may
//   node scripts/repair-image-refs.mjs --push      # sua + commit + push
//
// AN TOAN: sao luu products.ts thanh products.ts.bak-repairimg (da nam
// trong .gitignore) truoc khi ghi de lan dau. Chi doc/sua, KHONG dong vao
// file anh nao.

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PRODUCTS_PATH = path.join(ROOT, "src/data/products.ts");
const BACKUP_PATH = path.join(ROOT, "src/data/products.ts.bak-repairimg");

const args = process.argv.slice(2);
const DRY = args.includes("--dry-run");
const PUSH = args.includes("--push");

function git(gitArgs, opts = {}) {
  try {
    return execFileSync("git", gitArgs, { cwd: ROOT, encoding: "utf8", ...opts });
  } catch (e) {
    console.error(`\nLenh "git ${gitArgs.join(" ")}" bi loi:\n${(e.stdout ?? "") + (e.stderr ?? "")}`.trim());
    process.exit(1);
  }
}

// Tap hop toan bo duong dan "/anh1/<Folder>/<File>" DA COMMIT len Git,
// giu nguyen hoa/thuong that (dung chuan Linux/Vercel).
function loadTrackedAnh1Urls() {
  const out = git(["ls-files", "public/anh1"]).split("\n").filter(Boolean);
  const set = new Set();
  for (const rel of out) {
    // rel dang "public/anh1/DC90KT/01.jpg"
    const m = rel.match(/^public\/anh1\/(.+)$/);
    if (!m) continue;
    set.add(`/anh1/${m[1]}`);
  }
  return set;
}

// folder-that (dung hoa/thuong) -> danh sach file that, theo thu tu ten (tu nhien)
function buildFolderIndex(trackedSet) {
  const idx = new Map(); // key: folder viet thuong -> { folder, urls: [] }
  for (const url of trackedSet) {
    const m = url.match(/^\/anh1\/([^/]+)\/(.+)$/);
    if (!m) continue;
    const key = m[1].toLowerCase();
    if (!idx.has(key)) idx.set(key, { folder: m[1], urls: [] });
    idx.get(key).urls.push(url);
  }
  for (const v of idx.values()) v.urls.sort((a, b) => a.localeCompare(b, "en", { numeric: true, sensitivity: "base" }));
  return idx;
}

function splitProductBlocks(source) {
  const blocks = [];
  const regex = /  \{\n(?:.*\n)*?  \},\n/g;
  let m;
  while ((m = regex.exec(source)) !== null) blocks.push({ text: m[0], start: m.index, end: regex.lastIndex });
  return blocks;
}

function extractField(blockText, field) {
  const m = blockText.match(new RegExp(`${field}:\\s*"((?:[^"\\\\]|\\\\.)*)"`));
  return m ? m[1] : null;
}
function extractStringArray(blockText, field) {
  const m = blockText.match(new RegExp(`${field}:\\s*\\[([^\\]]*)\\]`));
  if (!m) return null;
  return [...m[1].matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((x) => x[1]);
}

function decodeUrl(u) {
  try {
    return decodeURIComponent(u);
  } catch {
    return u;
  }
}

function applyImages(blockText, urls) {
  const imageRe = /^([ \t]*)image:\s*"(?:[^"\\]|\\.)*",?[ \t]*$/m;
  const imagesRe = /^[ \t]*images:\s*\[[^\]]*\],?[ \t]*\n/m;
  let out = blockText.replace(imagesRe, "");
  const galleryLine = (indent) => (urls.length >= 2 ? `\n${indent}images: [${urls.map((u) => `"${u}"`).join(", ")}],` : "");
  return out.replace(imageRe, (_m, indent) => `${indent}image: "${urls[0]}",${galleryLine(indent)}`);
}

function removeImageField(blockText) {
  // Khong con anh nao hop le -> xoa han field image/images, tranh <img> loi hoan toan.
  return blockText
    .replace(/^[ \t]*images:\s*\[[^\]]*\],?[ \t]*\n/m, "")
    .replace(/^[ \t]*image:\s*"(?:[^"\\]|\\.)*",?[ \t]*\n/m, "");
}

function main() {
  console.log("Doc danh sach anh da commit tren GitHub (git ls-files)...");
  const tracked = loadTrackedAnh1Urls();
  const folderIndex = buildFolderIndex(tracked);
  console.log(`Co ${tracked.size} file anh dang nam trong public/anh1 tren Git, ${folderIndex.size} thu muc SKU.\n`);

  const raw = fs.readFileSync(PRODUCTS_PATH, "utf8");
  const crlf = raw.includes("\r\n");
  let source = crlf ? raw.replace(/\r\n/g, "\n") : raw;
  const blocks = splitProductBlocks(source);

  const repaired = []; // { sku, block, newText, before, after }
  const emptied = []; // san pham khong con anh nao hop le
  let scanned = 0;

  for (const b of blocks) {
    const sku = extractField(b.text, "sku");
    if (!sku) continue; // bo qua khoi danh muc

    const imageRaw = extractField(b.text, "image");
    if (!imageRaw || !imageRaw.startsWith("/anh1/")) continue; // chi xu ly anh cuc bo trong anh1

    const imagesRaw = extractStringArray(b.text, "images") ?? [imageRaw];
    scanned++;

    const valid = imagesRaw.filter((u) => tracked.has(decodeUrl(u)));
    const isBroken = valid.length !== imagesRaw.length || !tracked.has(decodeUrl(imageRaw));

    if (!isBroken) continue;

    let finalUrls = valid;
    if (finalUrls.length === 0) {
      const folder = folderIndex.get(sku.toLowerCase());
      if (folder) finalUrls = folder.urls;
    }

    if (finalUrls.length === 0) {
      emptied.push(sku);
      const newText = removeImageField(b.text);
      repaired.push({ sku, block: b, newText, before: imagesRaw.length, after: 0 });
      continue;
    }

    const newText = applyImages(b.text, finalUrls);
    if (newText === b.text) continue;
    repaired.push({ sku, block: b, newText, before: imagesRaw.length, after: finalUrls.length });
  }

  console.log(`Da kiem tra ${scanned} san pham dung anh /anh1/...`);
  console.log(`${DRY ? "[XEM TRUOC - CHUA GHI GI] " : ""}Can sua: ${repaired.length} san pham\n`);
  repaired.slice(0, 30).forEach((r) => console.log(`  ${r.sku}: ${r.before} anh khai bao -> ${r.after} anh hop le`));
  if (repaired.length > 30) console.log(`  ... va ${repaired.length - 30} san pham khac`);

  if (emptied.length) {
    console.log(`\nCo ${emptied.length} san pham SAU KHI DON KHONG CON anh hop le nao (da xoa field anh, can bo sung thu cong):`);
    console.log(`  ${emptied.slice(0, 30).join(", ")}${emptied.length > 30 ? " ..." : ""}`);
  }

  if (DRY) return;
  if (!repaired.length) {
    console.log("\nKhong co gi de sua.");
    return;
  }

  let out = source;
  for (const r of [...repaired].sort((a, b) => b.block.start - a.block.start)) {
    out = out.slice(0, r.block.start) + r.newText + out.slice(r.block.end);
  }
  if (!fs.existsSync(BACKUP_PATH)) {
    fs.copyFileSync(PRODUCTS_PATH, BACKUP_PATH);
    console.log(`\nDa sao luu ban truoc khi sua: ${BACKUP_PATH}`);
  }
  fs.writeFileSync(PRODUCTS_PATH, crlf ? out.replace(/\n/g, "\r\n") : out, "utf8");
  console.log(`Da sua ${repaired.length} san pham trong src/data/products.ts`);

  if (!PUSH) {
    console.log("\nChua day len GitHub. Chay:");
    console.log("  git add src/data/products.ts");
    console.log('  git commit -m "sua anh khai bao sai lech voi file that tren GitHub"');
    console.log("  git pull --rebase --autostash");
    console.log("  git push");
    return;
  }

  console.log("\nDang commit + push...");
  git(["add", "src/data/products.ts"], { stdio: "inherit" });
  git(["commit", "-m", `sua anh khai bao sai lech voi file that tren GitHub (${repaired.length} san pham)`], { stdio: "inherit" });
  git(["pull", "--rebase", "--autostash"], { stdio: "inherit" });
  git(["push"], { stdio: "inherit" });
  console.log("\nXong. Vao Vercel > Deployments, doi ban moi bao Ready (1-2 phut) roi Ctrl+F5.");
}

main();
