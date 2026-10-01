// Tao anh thumbnail WebP nhe cho danh sach san pham (card, trang chu, o tron
// danh muc) va ghi duong dan vao truong `thumb` trong src/data/products.ts.
//
// Vi sao can: images.unoptimized = true (Vercel het han muc toi uu anh) nen
// trinh duyet tai nguyen anh goc (600-800px, co anh 280KB) de hien o 133-298px.
// Script nay lam viec do 1 lan tren may ban, khong ton han muc Vercel.
//
// Cach chay (o thu muc goc project):
//   npm i -D sharp          (chi lan dau, neu chua co)
//   node scripts/make-thumbs.mjs            -> chi tao anh con thieu (chay lai an toan)
//   node scripts/make-thumbs.mjs --force    -> tao lai toan bo
//
// Ket qua: public/thumbs/<thu-muc>/<ten>.webp  +  dong `thumb: "..."` trong products.ts.
// San pham dung anh tu Vercel Blob (https://...) duoc bo qua, van dung anh goc.
// Moi anh con co ban SIEU NHO (260px) trong public/thumbs/sm/ cho o tron danh muc.
// Dong thoi tao ban banner nho public/banners/sm/<ten>.webp (800px) cho mobile.

import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const ROOT = process.cwd();
const PUBLIC_DIR = path.join(ROOT, "public");
const THUMB_DIR = path.join(PUBLIC_DIR, "thumbs");
const DATA_FILE = path.join(ROOT, "src", "data", "products.ts");

const WIDTH = 480; // px - du net cho card 298px tren man hinh Retina
const QUALITY = 72;
const SM_WIDTH = 260; // o tron danh muc hien ~133px -> 260px la du cho man hinh Retina
const SM_QUALITY = 70;
const CONCURRENCY = 8;
const BANNER_DIR = path.join(PUBLIC_DIR, "banners");
const BANNER_WIDTH = 800; // ban nho cho mobile (ban goc 1300px van dung cho man hinh to)
const FORCE = process.argv.includes("--force");

const safeSegment = (s) => s.replace(/[^A-Za-z0-9._-]+/g, "_");

// "/anh1/DC72E1/01.jpg" -> { url: "/thumbs/anh1/DC72E1/01.webp", file: <duong dan tren dia> }
function thumbTarget(src) {
  const rel = src.replace(/^\/+/, "").split("/").map(safeSegment);
  const name = rel.pop().replace(/\.[A-Za-z0-9]+$/, "") + ".webp";
  return {
    url: "/" + ["thumbs", ...rel, name].join("/"),
    file: path.join(THUMB_DIR, ...rel, name),
    smFile: path.join(THUMB_DIR, "sm", ...rel, name), // /thumbs/sm/...
  };
}

async function exists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

// Ban 260px: tao tu anh goc (hoac tu thumbnail neu mat anh goc). Loi -> copy thumbnail
// de duong dan /thumbs/sm/... luon ton tai (khong bao gio vo anh).
async function ensureSmall(src, smFile, mainFile) {
  if (!FORCE && (await exists(smFile))) return false;
  await fs.mkdir(path.dirname(smFile), { recursive: true });
  try {
    const input = (await findSource(src)) ?? mainFile;
    await sharp(input, { animated: false })
      .rotate()
      .resize({ width: SM_WIDTH, withoutEnlargement: true })
      .webp({ quality: SM_QUALITY })
      .toFile(smFile);
  } catch {
    await fs.copyFile(mainFile, smFile);
  }
  return true;
}

async function findSource(src) {
  const raw = path.join(PUBLIC_DIR, ...src.split("/").filter(Boolean));
  if (await exists(raw)) return raw;
  try {
    const decoded = path.join(PUBLIC_DIR, ...decodeURIComponent(src).split("/").filter(Boolean));
    if (await exists(decoded)) return decoded;
  } catch {
    /* ignore */
  }
  return null;
}

// Banner: public/banners/x.webp -> public/banners/sm/x.webp (rong 800px).
async function makeBannerVariants() {
  let names = [];
  try {
    names = (await fs.readdir(BANNER_DIR, { withFileTypes: true }))
      .filter((e) => e.isFile() && /\.(webp|jpe?g|png)$/i.test(e.name))
      .map((e) => e.name);
  } catch {
    return; // khong co thu muc banners
  }
  await fs.mkdir(path.join(BANNER_DIR, "sm"), { recursive: true });
  let n = 0;
  for (const name of names) {
    const out = path.join(BANNER_DIR, "sm", name.replace(/\.[A-Za-z0-9]+$/, "") + ".webp");
    if (!FORCE && (await exists(out))) continue;
    await sharp(path.join(BANNER_DIR, name))
      .resize({ width: BANNER_WIDTH, withoutEnlargement: true })
      .webp({ quality: 75 })
      .toFile(out);
    n++;
  }
  console.log(`Banner: tao ${n} ban nho trong public/banners/sm/ (tong ${names.length} banner).`);
}

async function main() {
  let text = await fs.readFile(DATA_FILE, "utf8");
  const originalText = text;
  const eol = text.includes("\r\n") ? "\r\n" : "\n";

  // 1) Them kieu `thumb?: string` vao type Product (chi lam 1 lan).
  if (!/^\s*thumb\?: string;/m.test(text)) {
    const before = text;
    text = text.replace(
      /(\r?\n {2}image\?: string;)/,
      `$1${eol}  // Anh thumbnail WebP nho (scripts/make-thumbs.mjs tao) cho card/danh sach.${eol}  thumb?: string;`
    );
    if (text === before) throw new Error("Khong tim thay dong `image?: string;` trong type Product.");
  }

  // 2) Gom cac anh chinh (dong `    image: "..."`) la anh noi bo.
  const imgRe = /^( {4}image: ")([^"]+)(",\r?\n)( {4}thumb: "[^"]*",\r?\n)?/gm;
  const sources = new Set();
  for (const m of text.matchAll(imgRe)) {
    if (m[2].startsWith("/")) sources.add(m[2]);
  }
  console.log(`Tim thay ${sources.size} anh noi bo can thumbnail.`);

  // 3) Tao thumbnail (song song vua phai).
  const list = [...sources];
  const ok = new Map(); // src -> thumb url
  const failed = [];
  let created = 0;
  let skipped = 0;
  let smallCreated = 0;
  let bytes = 0;
  let idx = 0;

  async function worker() {
    while (idx < list.length) {
      const src = list[idx++];
      const { url, file, smFile } = thumbTarget(src);
      try {
        if (!FORCE && (await exists(file))) {
          skipped++;
          bytes += (await fs.stat(file)).size;
          if (await ensureSmall(src, smFile, file)) smallCreated++;
          ok.set(src, url);
          continue;
        }
        const input = await findSource(src);
        if (!input) {
          failed.push(`${src} (khong thay file)`);
          continue;
        }
        await fs.mkdir(path.dirname(file), { recursive: true });
        const info = await sharp(input, { animated: false })
          .rotate()
          .resize({ width: WIDTH, withoutEnlargement: true })
          .webp({ quality: QUALITY })
          .toFile(file);
        bytes += info.size;
        created++;
        if (await ensureSmall(src, smFile, file)) smallCreated++;
        ok.set(src, url);
      } catch (e) {
        failed.push(`${src} (${e.message})`);
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  // 4) Ghi `thumb: "..."` ngay sau dong `image:` (chi cho anh tao thanh cong).
  let patched = 0;
  text = text.replace(imgRe, (whole, a, src, b) => {
    const url = ok.get(src);
    if (!url) return `${a}${src}${b}`; // giu nguyen, bo dong thumb cu neu anh loi
    patched++;
    return `${a}${src}${b}    thumb: "${url}",${eol}`;
  });
  if (text !== originalText) await fs.writeFile(DATA_FILE, text, "utf8");

  await makeBannerVariants();

  console.log(`Tao moi: ${created} | Da co san: ${skipped} | Loi: ${failed.length} | Ban 260px moi: ${smallCreated}`);
  console.log(`Da ghi truong thumb cho ${patched} san pham.`);
  if (ok.size) console.log(`Tong dung luong thumbnail: ${(bytes / 1024 / 1024).toFixed(1)} MB (TB ${(bytes / ok.size / 1024).toFixed(1)} KB/anh)`);
  if (failed.length) {
    console.log("Cac anh loi (san pham nay van dung anh goc):");
    failed.slice(0, 30).forEach((f) => console.log("  - " + f));
    if (failed.length > 30) console.log(`  ... va ${failed.length - 30} anh nua`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
