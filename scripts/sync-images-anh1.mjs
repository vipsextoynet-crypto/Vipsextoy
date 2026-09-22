// scripts/sync-images-anh1.mjs
//
// Dien anh cho san pham tu thu muc public/anh1/<SKU>/ (ten thu muc = ma SKU),
// ghi vao src/data/products.ts, roi (tuy chon) commit + push len GitHub.
//
// MAC DINH chi xu ly san pham CHUA CO anh (vd san pham vua them trong admin
// ma khong nhap link anh). Them --all neu muon lam moi anh cho MOI san pham
// co thu muc.
//
// CACH DUNG (trong G:\vipextoy)
//   node scripts/sync-images-anh1.mjs --dry-run   # chi xem truoc, khong sua gi
//   node scripts/sync-images-anh1.mjs             # sua products.ts o may, chua day len GitHub
//   node scripts/sync-images-anh1.mjs --push      # sua + commit + push len GitHub (1 lenh)
//
// Tuy chon:
//   --all        lam moi anh cho moi san pham co thu muc (mac dinh: chi san pham chua co anh)
//   --dir=anh1   ten thu muc anh trong public/ (mac dinh anh1)
//   --max-mb=30  khi --push: dung lai neu tong anh se day len vuot so MB nay (mac dinh 30)
//
// Voi --push, script tu lam theo thu tu:
//   git pull --rebase --autostash   (lay san pham moi nhat ma admin da luu tren GitHub)
//   -> cap nhat products.ts
//   -> git add -f <cac thu muc anh vua dung> + products.ts
//   -> git commit -> git pull --rebase --autostash -> git push
// Commit nay la commit THUONG (khong co [draft]) nen Vercel build 1 lan va dua
// LEN WEB luon ca cac thay doi nhap khac dang cho dang.
//
// AN TOAN: sao luu products.ts thanh products.ts.bak-anh1 (neu chua co); giu nguyen
// chu hoa/thuong cua ten thu muc va ten file (Vercel/Linux phan biet hoa thuong).

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PRODUCTS_PATH = path.join(ROOT, "src/data/products.ts");
const BACKUP_PATH = path.join(ROOT, "src/data/products.ts.bak-anh1");
const VALID_EXT = new Set([".jpg", ".jpeg", ".png", ".webp"]);

const args = process.argv.slice(2);
const DRY = args.includes("--dry-run");
const ALL = args.includes("--all");
const PUSH = args.includes("--push");
const opt = (name, def) => {
  const a = args.find((x) => x.startsWith(`--${name}=`));
  return a ? a.slice(name.length + 3) : def;
};
const DIR_NAME = opt("dir", "anh1");
const MAX_MB = parseFloat(opt("max-mb", "30")) || 30;
const IMAGES_ROOT = path.join(ROOT, "public", DIR_NAME);

function git(gitArgs, { allowFail = false } = {}) {
  try {
    const out = execFileSync("git", gitArgs, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    if (out.trim()) console.log(out.trim());
    return true;
  } catch (e) {
    const msg = `${e.stdout ?? ""}${e.stderr ?? ""}`.trim();
    if (allowFail) return false;
    console.error(`\nLenh "git ${gitArgs.join(" ")}" bi loi:\n${msg}`);
    process.exit(1);
  }
}

function fmtMB(b) {
  return (b / 1024 / 1024).toFixed(1) + " MB";
}

function numericSort(a, b) {
  return a.localeCompare(b, "en", { numeric: true, sensitivity: "base" });
}

// sku viet thuong -> { folder (dung chu hoa/thuong that), files[] }
function scanFolders() {
  if (!fs.existsSync(IMAGES_ROOT)) {
    console.error(`Khong tim thay thu muc ${IMAGES_ROOT}`);
    process.exit(1);
  }
  const map = new Map();
  for (const d of fs.readdirSync(IMAGES_ROOT, { withFileTypes: true })) {
    if (!d.isDirectory()) continue;
    const files = fs
      .readdirSync(path.join(IMAGES_ROOT, d.name))
      .filter((f) => VALID_EXT.has(path.extname(f).toLowerCase()))
      .sort(numericSort);
    if (files.length) map.set(d.name.toLowerCase(), { folder: d.name, files });
  }
  return map;
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

function hasImage(blockText) {
  const v = extractField(blockText, "image");
  return !!(v && v.trim());
}

const urlOf = (folder, file) => `/${DIR_NAME}/${encodeURIComponent(folder)}/${encodeURIComponent(file)}`.replace(/%2F/g, "/");

function applyImages(blockText, urls) {
  const imageRe = /^([ \t]*)image:\s*"(?:[^"\\]|\\.)*",?[ \t]*$/m;
  const imagesRe = /^[ \t]*images:\s*\[[^\]]*\],?[ \t]*\n/m;

  let out = blockText.replace(imagesRe, ""); // bo gallery cu, dung lai theo thu muc
  const galleryLine = (indent) => (urls.length >= 2 ? `\n${indent}images: [${urls.map((u) => `"${u}"`).join(", ")}],` : "");

  if (imageRe.test(out)) {
    return out.replace(imageRe, (_m, indent) => `${indent}image: "${urls[0]}",${galleryLine(indent)}`);
  }
  const indent = "    ";
  return out.replace(/(  \},\n)$/, `${indent}image: "${urls[0]}",${galleryLine(indent)}\n$1`);
}

function main() {
  if (PUSH && !DRY) {
    console.log("Buoc 1/3: lay ban moi nhat tu GitHub (san pham vua them trong admin)...");
    git(["pull", "--rebase", "--autostash"]);
  }

  const folders = scanFolders();
  console.log(`Tim thay anh cho ${folders.size} SKU trong ${IMAGES_ROOT}`);

  const raw = fs.readFileSync(PRODUCTS_PATH, "utf8");
  const crlf = raw.includes("\r\n");
  let source = crlf ? raw.replace(/\r\n/g, "\n") : raw;

  const blocks = splitProductBlocks(source);
  const updates = []; // { sku, folder, urls, block, newText }
  let noImageNoFolder = [];

  for (const b of blocks) {
    const sku = extractField(b.text, "sku");
    if (!sku) continue;
    const found = folders.get(sku.toLowerCase());
    const needs = ALL || !hasImage(b.text);
    if (!found) {
      if (!hasImage(b.text)) noImageNoFolder.push(sku);
      continue;
    }
    if (!needs) continue;
    const urls = found.files.map((f) => urlOf(found.folder, f));
    const newText = applyImages(b.text, urls);
    if (newText === b.text) continue;
    updates.push({ sku, folder: found.folder, files: found.files, urls, block: b, newText });
  }

  console.log(`\n${DRY ? "[XEM TRUOC - CHUA GHI GI] " : ""}San pham se duoc dien anh: ${updates.length}${ALL ? " (che do --all)" : " (chi san pham chua co anh)"}`);
  updates.slice(0, 30).forEach((u) => console.log(`  ${u.sku} -> ${u.urls[0]}${u.urls.length > 1 ? `  (+${u.urls.length - 1} anh phu)` : ""}`));
  if (updates.length > 30) console.log(`  ... va ${updates.length - 30} san pham khac`);
  if (noImageNoFolder.length) {
    console.log(`\nCo ${noImageNoFolder.length} san pham chua co anh va cung KHONG co thu muc ${DIR_NAME}/<SKU>: ${noImageNoFolder.slice(0, 10).join(", ")}${noImageNoFolder.length > 10 ? " ..." : ""}`);
  }
  if (DRY) return;
  if (!updates.length) {
    console.log("\nKhong co gi de cap nhat.");
    return;
  }

  // Kiem tra dung luong truoc khi ghi/day len
  const dirs = [...new Set(updates.map((u) => u.folder))];
  let totalBytes = 0;
  for (const u of updates) for (const f of u.files) totalBytes += fs.statSync(path.join(IMAGES_ROOT, u.folder, f)).size;
  console.log(`\nTong anh cua cac san pham nay: ${fmtMB(totalBytes)} (${updates.reduce((n, u) => n + u.files.length, 0)} file).`);
  if (PUSH && totalBytes > MAX_MB * 1024 * 1024) {
    console.error(
      `Vuot ${MAX_MB} MB - khong day len GitHub de tranh lam nang repo. Hay nen anh nho lai hoac dung Vercel Blob (trang admin > Tai anh theo thu muc). ` +
        `Neu van muon day, chay lai voi --max-mb=<so lon hon>.`
    );
    process.exit(1);
  }

  // Ghi products.ts (tu cuoi len dau de khong lech vi tri)
  let out = source;
  for (const u of [...updates].sort((a, b) => b.block.start - a.block.start)) {
    out = out.slice(0, u.block.start) + u.newText + out.slice(u.block.end);
  }
  if (!fs.existsSync(BACKUP_PATH)) {
    fs.copyFileSync(PRODUCTS_PATH, BACKUP_PATH);
    console.log(`Da sao luu ban truoc khi sua: ${BACKUP_PATH}`);
  }
  fs.writeFileSync(PRODUCTS_PATH, crlf ? out.replace(/\n/g, "\r\n") : out, "utf8");
  console.log(`Da cap nhat ${updates.length} san pham trong src/data/products.ts`);

  const addDirs = dirs.map((d) => `public/${DIR_NAME}/${d}`);
  if (!PUSH) {
    console.log("\nChua day len GitHub. Muon day len, chay:");
    console.log(`  git add -f ${addDirs.map((d) => `"${d}"`).join(" ")} src/data/products.ts`);
    console.log(`  git commit -m "cap nhat anh san pham"`);
    console.log("  git pull --rebase --autostash");
    console.log("  git push");
    console.log("Hoac chay lai script voi --push de lam tu dong.");
    return;
  }

  console.log("\nBuoc 2/3: commit...");
  git(["add", "-f", ...addDirs]);
  git(["add", "src/data/products.ts"]);
  const skus = updates.map((u) => u.sku);
  const list = skus.length > 5 ? `${skus.slice(0, 5).join(", ")} va ${skus.length - 5} san pham khac` : skus.join(", ");
  git(["commit", "-m", `cap nhat anh san pham: ${list}`]);

  console.log("\nBuoc 3/3: day len GitHub...");
  git(["pull", "--rebase", "--autostash"]);
  git(["push"]);
  console.log("\nXong. Vao Vercel > Deployments, doi ban moi bao Ready (1-2 phut) roi Ctrl+F5 xem trang san pham.");
}

main();
