// scripts/webp-new-sku.mjs
//
// Nen + doi sang WebP anh cua cac thu muc SKU MOI trong public/anh1/<SKU>/.
// Chi dong vao thu muc SKU moi (KHONG quet 1.800 san pham cu):
//   - Mac dinh: thu muc chua duoc Git theo doi ("untracked") = thu muc moi
//     ban vua bo vao, chua commit.
//   - Hoac chi dinh ro:  --sku=DC82C,DC83A
//
// Voi moi anh: .jpg/.jpeg/.png/.gif/.avif/.tif  ->  <ten-cu>.webp
//   - Thu nho ve rong toi da 1000px (khong phong to anh nho), chat luong 80.
//   - Tu xoay dung chieu theo EXIF, bo thong tin may anh/GPS (nhe hon, rieng tu hon).
//   - Anh PNG trong suot van giu nen trong suot.
//   - Anh .webp co san: chi nen lai neu rong hon 1000px hoac nang hon 500KB
//     (chay lai nhieu lan khong lam anh xau dan).
//   - Ban GOC khong bi xoa that su: duoc chuyen vao thu muc tam cua may
//     (duong dan in ra cuoi cung), de ban lay lai neu can.
//
// CACH DUNG (trong G:\vipextoy)
//   node scripts/webp-new-sku.mjs --dry-run            # xem truoc, KHONG ghi gi
//   node scripts/webp-new-sku.mjs                      # lam that cho cac thu muc moi
//   node scripts/webp-new-sku.mjs --sku=DC82C,DC83A    # chi dinh thu muc
//   Tuy chon: --max-width=1000  --quality=80  --dir=anh1
//
// BUOC TIEP THEO sau khi chay xong:
//   node scripts/sync-images-anh1.mjs --dry-run   -> gan anh vao san pham

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const getArg = (name, def) => {
  const a = args.find((x) => x.startsWith(`--${name}=`));
  return a ? a.slice(name.length + 3) : def;
};
const DRY = args.includes("--dry-run");
const DIR = getArg("dir", "anh1");
const MAX_WIDTH = parseInt(getArg("max-width", "1000"), 10);
const QUALITY = parseInt(getArg("quality", "80"), 10);
const SKU_ARG = getArg("sku", "");
const IMAGES_ROOT = path.join(ROOT, "public", DIR);

const CONVERT_EXT = new Set([".jpg", ".jpeg", ".png", ".gif", ".avif", ".tif", ".tiff"]);
const WEBP_RECOMPRESS_KB = 500; // webp lon hon muc nay (hoac qua rong) moi nen lai

function findNewFolders() {
  let out;
  try {
    out = execFileSync(
      "git",
      ["status", "--porcelain", "-z", "--untracked-files=all", "--ignored", "--", `public/${DIR}`],
      { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }
    );
  } catch {
    console.error("Khong chay duoc git. Hay chi dinh thu muc bang --sku=DC82C,DC83A");
    process.exit(1);
  }
  const prefix = `public/${DIR}/`;
  const set = new Set();
  for (const entry of out.split("\0")) {
    // "??" = chua theo doi; "!!" = bi .gitignore (anh moi thuong nam o day vi anh
    // da commit duoc them bang "git add -f"). Anh da commit khong xuat hien o day.
    if (!entry.startsWith("?? ") && !entry.startsWith("!! ")) continue;
    const p = entry.slice(3).replace(/\\/g, "/");
    if (!p.startsWith(prefix)) continue;
    const sku = p.slice(prefix.length).split("/")[0];
    if (sku) set.add(sku);
  }
  return [...set];
}

if (!fs.existsSync(IMAGES_ROOT)) {
  console.error(`Khong tim thay thu muc ${IMAGES_ROOT}`);
  process.exit(1);
}

let folders = SKU_ARG
  ? SKU_ARG.split(",").map((s) => s.trim()).filter(Boolean)
  : findNewFolders();

folders = folders.filter((f) => !f.startsWith("_") && !f.toLowerCase().startsWith("legacy-"));

if (!folders.length) {
  console.log("Khong co thu muc SKU moi nao (thu muc chua commit). Neu da commit roi, dung --sku=MA_SKU.");
  process.exit(0);
}

const backupRoot = path.join(os.tmpdir(), `vipextoy-anh-goc-${Date.now()}`);
const naturalCompare = (a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
let totalBefore = 0;
let totalAfter = 0;
let totalFiles = 0;

console.log(`${DRY ? "[DRY-RUN] " : ""}Rong toi da ${MAX_WIDTH}px, chat luong ${QUALITY}. ${folders.length} thu muc: ${folders.join(", ")}\n`);

for (const sku of folders) {
  const dir = path.join(IMAGES_ROOT, sku);
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
    console.log(`- ${sku}: KHONG co thu muc public/${DIR}/${sku} (kiem tra lai ten, Vercel phan biet hoa/thuong)`);
    continue;
  }
  if (!/^[A-Za-z0-9_-]+$/.test(sku)) {
    console.log(`  ! Ten thu muc "${sku}" co dau cach/ky tu la - nen dat dung ma SKU (chu, so, gach noi).`);
  }

  const files = fs.readdirSync(dir).filter((f) => fs.statSync(path.join(dir, f)).isFile()).sort(naturalCompare);
  const used = new Set(files.map((f) => f.toLowerCase()));
  let before = 0;
  let after = 0;
  let n = 0;
  const lines = [];

  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    const isWebp = ext === ".webp";
    if (!isWebp && !CONVERT_EXT.has(ext)) continue; // bo qua file khong phai anh

    const src = path.join(dir, file);
    const buf = fs.readFileSync(src);
    const meta = await sharp(buf).metadata();

    if (isWebp && (meta.width ?? 0) <= MAX_WIDTH && buf.length <= WEBP_RECOMPRESS_KB * 1024) {
      before += buf.length;
      after += buf.length;
      lines.push(`  = ${file}  ${Math.round(buf.length / 1024)} KB (webp san co, giu nguyen)`);
      continue;
    }

    const base = path.basename(file, path.extname(file));
    let outName = `${base}.webp`;
    if (!isWebp && used.has(outName.toLowerCase())) {
      let i = 2;
      while (used.has(`${base}-${i}.webp`.toLowerCase())) i++;
      outName = `${base}-${i}.webp`;
    }

    const out = await sharp(buf)
      .rotate()
      .resize({ width: MAX_WIDTH, withoutEnlargement: true })
      .webp({ quality: QUALITY })
      .toBuffer({ resolveWithObject: true });

    used.add(outName.toLowerCase());
    before += buf.length;
    after += out.data.length;
    n++;
    lines.push(`  + ${file} -> ${outName}  ${Math.round(buf.length / 1024)} KB -> ${Math.round(out.data.length / 1024)} KB  (${out.info.width}x${out.info.height})`);

    if (!DRY) {
      const bdir = path.join(backupRoot, sku);
      fs.mkdirSync(bdir, { recursive: true });
      fs.copyFileSync(src, path.join(bdir, file));
      fs.writeFileSync(path.join(dir, outName), out.data);
      if (path.join(dir, outName).toLowerCase() !== src.toLowerCase()) fs.unlinkSync(src);
    }
  }

  totalBefore += before;
  totalAfter += after;
  totalFiles += n;
  console.log(`- ${sku}: ${n} anh chuyen, ${(before / 1024).toFixed(0)} KB -> ${(after / 1024).toFixed(0)} KB`);
  lines.forEach((l) => console.log(l));
}

console.log(`\nTong: ${totalFiles} anh, ${(totalBefore / 1024 / 1024).toFixed(2)} MB -> ${(totalAfter / 1024 / 1024).toFixed(2)} MB`);
if (DRY) {
  console.log("(--dry-run) Chua ghi gi ca.");
} else if (totalFiles) {
  console.log(`Ban goc luu tai: ${backupRoot}`);
  console.log("Buoc tiep theo: node scripts/sync-images-anh1.mjs --dry-run");
}
