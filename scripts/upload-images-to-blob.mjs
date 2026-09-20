// scripts/upload-images-to-blob.mjs
//
// Nen anh trong public/anh/<SKU>/ sang WebP, tai len Vercel Blob, roi ghi
// duong link moi vao src/data/products.ts. Sau do ban co the bo thu muc
// public/anh khoi Git (khong con phai day ~1 GB anh len GitHub).
//
// CHUAN BI (1 lan)
//   1) npm i -D sharp
//   2) Lay token Blob ve may:  vercel env pull .env.local
//      (hoac vao Vercel > Storage > Blob store > tab ".env.local", copy dong
//       BLOB_READ_WRITE_TOKEN=... vao file .env.local o thu muc goc project)
//
// CACH DUNG (chay lan luot)
//   node scripts/upload-images-to-blob.mjs --dry-run         # xem truoc, khong tai gi
//   node scripts/upload-images-to-blob.mjs --limit=3         # thu voi 3 SKU dau
//   node scripts/upload-images-to-blob.mjs                   # tai toan bo len Blob
//   node scripts/upload-images-to-blob.mjs --apply --dry-run # xem truoc phan ghi products.ts
//   node scripts/upload-images-to-blob.mjs --apply           # ghi link vao products.ts
//
// Tuy chon: --max-width=1200  --quality=80  --concurrency=5
//
// AN TOAN
//  - Chay lai bao nhieu lan cung duoc: SKU nao da tai xong (ghi trong
//    scripts/blob-images-map.json) se duoc bo qua, tai do dang se tiep tuc.
//  - Khong xoa/sua anh goc trong public/anh.
//  - --apply tu dong sao luu products.ts thanh products.ts.bak-blob (neu chua co).
//  - Anh tren Blob dat ten co dinh: products/<sku-viet-thuong>/01.webp, 02.webp...
//    (anh dau tien theo thu tu ten file la anh dai dien).

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const IMAGES_ROOT = path.join(ROOT, "public/anh1");
const MAP_PATH = path.join(ROOT, "scripts/blob-images-map.json");
const PRODUCTS_PATH = path.join(ROOT, "src/data/products.ts");
const BACKUP_PATH = path.join(ROOT, "src/data/products.ts.bak-blob");
const VALID_EXT = new Set([".jpg", ".jpeg", ".png", ".webp"]);

// ---------- tham so dong lenh ----------
const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const opt = (name, def) => {
  const a = args.find((x) => x.startsWith(`--${name}=`));
  return a ? a.split("=")[1] : def;
};
const DRY = flag("dry-run");
const APPLY = flag("apply");
const LIMIT = parseInt(opt("limit", "0"), 10) || 0;
const MAX_WIDTH = parseInt(opt("max-width", "1200"), 10);
const QUALITY = parseInt(opt("quality", "80"), 10);
const CONCURRENCY = Math.max(1, parseInt(opt("concurrency", "5"), 10) || 5);

// ---------- tien ich ----------
function loadEnvFiles() {
  for (const name of [".env.local", ".env"]) {
    const p = path.join(ROOT, name);
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      let v = m[2];
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      if (!(m[1] in process.env)) process.env[m[1]] = v;
    }
  }
}

function findBlobToken() {
  for (const [k, v] of Object.entries(process.env)) {
    if (k.endsWith("_READ_WRITE_TOKEN") && v) return v;
  }
  return undefined;
}

function loadMap() {
  return fs.existsSync(MAP_PATH) ? JSON.parse(fs.readFileSync(MAP_PATH, "utf8")) : {};
}
function saveMap(map) {
  fs.writeFileSync(MAP_PATH, JSON.stringify(map, null, 2), "utf8");
}

function scanFolders() {
  if (!fs.existsSync(IMAGES_ROOT)) {
    console.error(`Khong tim thay thu muc ${IMAGES_ROOT}`);
    process.exit(1);
  }
  const out = [];
  for (const d of fs.readdirSync(IMAGES_ROOT, { withFileTypes: true })) {
    if (!d.isDirectory()) continue;
    const dir = path.join(IMAGES_ROOT, d.name);
    const files = fs
      .readdirSync(dir)
      .filter((f) => VALID_EXT.has(path.extname(f).toLowerCase()))
      .sort((a, b) => a.localeCompare(b, "en", { numeric: true }));
    if (files.length) out.push({ sku: d.name.toLowerCase(), dir, files });
  }
  return out;
}

function fmtMB(bytes) {
  return (bytes / 1024 / 1024).toFixed(1) + " MB";
}

async function retry(fn, times = 3) {
  let lastErr;
  for (let i = 1; i <= times; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      await new Promise((r) => setTimeout(r, 800 * i));
    }
  }
  throw lastErr;
}

// ---------- PHASE 1: nen + tai len Blob ----------
async function uploadPhase() {
  const folders = scanFolders();
  const map = loadMap();
  let todo = folders.filter((f) => !map[f.sku]?.done);
  const totalFiles = folders.reduce((n, f) => n + f.files.length, 0);
  let originalBytes = 0;
  for (const f of folders) for (const file of f.files) originalBytes += fs.statSync(path.join(f.dir, file)).size;

  console.log(`Tim thay ${folders.length} SKU, ${totalFiles} anh, tong ${fmtMB(originalBytes)}.`);
  console.log(`Da tai xong truoc do: ${folders.length - todo.length} SKU. Con lai: ${todo.length} SKU.`);
  if (LIMIT) todo = todo.slice(0, LIMIT);

  if (DRY) {
    console.log(`\n[XEM TRUOC] Se nen (toi da rong ${MAX_WIDTH}px, WebP chat luong ${QUALITY}) va tai ${todo.length} SKU.`);
    todo.slice(0, 10).forEach((f) => console.log(`  ${f.sku}: ${f.files.length} anh`));
    if (todo.length > 10) console.log(`  ... va ${todo.length - 10} SKU khac`);
    return;
  }
  if (todo.length === 0) {
    console.log("Khong con gi de tai. Chay them --apply de ghi link vao products.ts.");
    return;
  }

  loadEnvFiles();
  const token = findBlobToken();
  if (!token) {
    console.error(
      "Khong thay token Blob. Chay `vercel env pull .env.local` hoac them dong\n" +
        "BLOB_READ_WRITE_TOKEN=... vao file .env.local (xem huong dan dau file nay)."
    );
    process.exit(1);
  }

  let sharp, put;
  try {
    sharp = (await import("sharp")).default;
  } catch {
    console.error("Chua cai sharp. Chay: npm i -D sharp");
    process.exit(1);
  }
  ({ put } = await import("@vercel/blob"));

  let done = 0;
  let sentBytes = 0;
  let failedFiles = 0;
  const queue = [...todo];

  async function worker() {
    while (queue.length) {
      const f = queue.shift();
      const urls = [];
      let index = 0;
      for (const file of f.files) {
        const src = path.join(f.dir, file);
        try {
          const buf = await sharp(src)
            .rotate()
            .resize({ width: MAX_WIDTH, withoutEnlargement: true })
            .webp({ quality: QUALITY })
            .toBuffer();
          index++;
          const blobPath = `products/${f.sku}/${String(index).padStart(2, "0")}.webp`;
          const res = await retry(() =>
            put(blobPath, buf, {
              access: "public",
              addRandomSuffix: false,
              allowOverwrite: true,
              contentType: "image/webp",
              cacheControlMaxAge: 31536000,
              token,
            })
          );
          urls.push(res.url);
          sentBytes += buf.length;
        } catch (e) {
          failedFiles++;
          console.warn(`  ! Bo qua ${f.sku}/${file}: ${e instanceof Error ? e.message : e}`);
        }
      }
      if (urls.length) {
        map[f.sku] = { urls, done: true };
        saveMap(map);
      }
      done++;
      if (done % 20 === 0 || done === todo.length) {
        console.log(`  ${done}/${todo.length} SKU  |  da tai ${fmtMB(sentBytes)}`);
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  console.log(`\nXong. Da tai ${fmtMB(sentBytes)} (sau nen). Anh loi/bo qua: ${failedFiles}.`);
  console.log("Buoc tiep theo: node scripts/upload-images-to-blob.mjs --apply --dry-run");
}

// ---------- PHASE 2: ghi link vao products.ts ----------
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

function applyUrlsToBlock(text, urls) {
  const imageRe = /^([ \t]*)image:\s*"(?:[^"\\]|\\.)*",?[ \t]*$/m;
  const imagesRe = /^[ \t]*images:\s*\[[^\]]*\],?[ \t]*\n/m;

  // xoa danh sach images cu (neu co), dung lai theo link moi
  let out = text.replace(imagesRe, "");

  const first = urls[0];
  if (imageRe.test(out)) {
    out = out.replace(imageRe, (_m, indent) => {
      let line = `${indent}image: "${first}",`;
      if (urls.length >= 2) {
        line += `\n${indent}images: [\n${urls.map((u) => `${indent}  "${u}",`).join("\n")}\n${indent}],`;
      }
      return line;
    });
  } else {
    // chua co field image -> them truoc dau "  },\n" cuoi block
    const indent = "    ";
    let add = `${indent}image: "${first}",\n`;
    if (urls.length >= 2) {
      add += `${indent}images: [\n${urls.map((u) => `${indent}  "${u}",`).join("\n")}\n${indent}],\n`;
    }
    out = out.replace(/(  \},\n)$/, add + "$1");
  }
  return out;
}

function applyPhase() {
  const map = loadMap();
  const skus = Object.keys(map).filter((k) => map[k]?.done && map[k].urls?.length);
  if (skus.length === 0) {
    console.error("Chua co SKU nao tren Blob (scripts/blob-images-map.json trong). Chay buoc tai len truoc.");
    process.exit(1);
  }

  const raw = fs.readFileSync(PRODUCTS_PATH, "utf8");
  const crlf = raw.includes("\r\n");
  let source = crlf ? raw.replace(/\r\n/g, "\n") : raw;

  const blocks = splitProductBlocks(source);
  let shift = 0;
  let updated = 0;
  let noProduct = new Set(skus);
  const log = [];

  for (const b of blocks) {
    const sku = extractField(b.text, "sku");
    if (!sku) continue;
    const entry = map[sku.toLowerCase()];
    if (!entry?.done || !entry.urls?.length) continue;
    noProduct.delete(sku.toLowerCase());

    const nt = applyUrlsToBlock(b.text, entry.urls);
    if (nt === b.text) continue;
    log.push(`${sku} -> ${entry.urls[0]}${entry.urls.length > 1 ? ` (+${entry.urls.length - 1} anh phu)` : ""}`);
    if (!DRY) {
      source = source.slice(0, b.start + shift) + nt + source.slice(b.end + shift);
      shift += nt.length - b.text.length;
    }
    updated++;
  }

  console.log(`${DRY ? "[XEM TRUOC - CHUA GHI GI] " : ""}Se cap nhat: ${updated} san pham.`);
  log.slice(0, 15).forEach((l) => console.log("  " + l));
  if (log.length > 15) console.log(`  ... va ${log.length - 15} san pham khac`);
  if (noProduct.size) console.log(`Co ${noProduct.size} SKU co anh tren Blob nhung khong co san pham tuong ung trong products.ts (bo qua).`);

  if (DRY) return;
  if (updated === 0) {
    console.log("Khong co gi thay doi.");
    return;
  }
  if (!fs.existsSync(BACKUP_PATH)) {
    fs.copyFileSync(PRODUCTS_PATH, BACKUP_PATH);
    console.log(`Da sao luu ban truoc khi sua: ${BACKUP_PATH}`);
  }
  fs.writeFileSync(PRODUCTS_PATH, crlf ? source.replace(/\n/g, "\r\n") : source, "utf8");
  console.log("Da ghi vao src/data/products.ts");
}

// ---------- main ----------
if (APPLY) applyPhase();
else await uploadPhase();
