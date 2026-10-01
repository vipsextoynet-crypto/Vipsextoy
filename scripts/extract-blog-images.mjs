// Tach anh base64 (src='data:image/...;base64,....') trong src/data/blog.ts ra
// file WebP that trong public/blog-inline/, roi thay bang duong dan ngan.
// Ket qua: blog.ts giam tu ~9MB xuong vai chuc KB, trang /blog/<bai> khong con
// phai tai HTML vai MB. Giu nguyen thuoc tinh alt, class va moi noi dung khac.
//
//   node scripts/extract-blog-images.mjs --dry-run   -> chi bao cao, KHONG ghi gi
//   node scripts/extract-blog-images.mjs             -> thuc hien
//
// An toan: ban sao blog.ts goc duoc luu o thu muc tam cua may (duong dan in ra);
// chay lai khong tao trung (ten file = ma bam noi dung anh).
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import sharp from "sharp";

const FILE = path.join(process.cwd(), "src", "data", "blog.ts");
const OUT_DIR = path.join(process.cwd(), "public", "blog-inline");
const URL_PREFIX = "/blog-inline";
const MAX_WIDTH = 1200;
const QUALITY = 75;
const DRY = process.argv.includes("--dry-run");

const RE = /src=(\\?["'])data:image\/([a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=]+)\1/g;

const text = fs.readFileSync(FILE, "utf8");
const found = [...text.matchAll(RE)];
console.log(`blog.ts: ${(text.length / 1024 / 1024).toFixed(2)} MB, tim thay ${found.length} anh base64.`);
if (!found.length) process.exit(0);

const results = new Map(); // hash -> { url, bytes, width }
let totalIn = 0;
let totalOut = 0;

for (const m of found) {
  const buf = Buffer.from(m[3], "base64");
  const hash = crypto.createHash("sha1").update(buf).digest("hex").slice(0, 12);
  totalIn += buf.length;
  if (results.has(hash)) continue;
  const name = `${hash}.webp`;
  const out = path.join(OUT_DIR, name);
  const webp = await sharp(buf)
    .rotate()
    .resize({ width: MAX_WIDTH, withoutEnlargement: true })
    .webp({ quality: QUALITY })
    .toBuffer({ resolveWithObject: true });
  totalOut += webp.data.length;
  results.set(hash, { url: `${URL_PREFIX}/${name}`, kb: Math.round(webp.data.length / 1024), w: webp.info.width, h: webp.info.height });
  if (!DRY) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
    fs.writeFileSync(out, webp.data);
  }
}

console.log(`Anh goc (da giai ma): ${(totalIn / 1024 / 1024).toFixed(1)} MB  ->  WebP: ${(totalOut / 1024 / 1024).toFixed(2)} MB (${results.size} file khac nhau)`);
for (const [h, r] of results) console.log(`  ${r.url}  ${r.w}x${r.h}  ${r.kb} KB`);

if (DRY) {
  console.log("\n(--dry-run) Chua ghi gi ca.");
  process.exit(0);
}

const next = text.replace(RE, (whole, q, _type, b64) => {
  const hash = crypto.createHash("sha1").update(Buffer.from(b64, "base64")).digest("hex").slice(0, 12);
  return `src=${q}${results.get(hash).url}${q}`;
});

const backup = path.join(os.tmpdir(), `blog.ts.backup-${Date.now()}`);
fs.writeFileSync(backup, text, "utf8");
fs.writeFileSync(FILE, next, "utf8");
console.log(`\nDa ghi src/data/blog.ts: ${(next.length / 1024).toFixed(0)} KB (truoc: ${(text.length / 1024 / 1024).toFixed(2)} MB).`);
console.log(`Ban sao luu blog.ts goc: ${backup}`);
