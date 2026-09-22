// scripts/compress-images.mjs
//
// Nen/resize lai TOAN BO anh that (.jpg/.jpeg/.png/.webp) trong
// public/anh1/, GIU NGUYEN duong dan + ten file + duoi file (khong doi
// .png thanh .jpg) de khong lam gay bat ky link nao da ghi trong
// products.ts. Chi resize bot neu anh qua to + nen lai chat luong vua
// phai - AN TOAN: chi ghi de neu ban nen RA NHO HON ban goc, file nao
// nen ra to hon hoac loi thi GIU NGUYEN ban goc, khong dong vao.
//
// Tu dong bo qua public/anh1/_debug/, public/anh1/_state/ va cac file
// khong phai anh (.html, .txt, .jsonl...).
//
// CACH DUNG
// ---------
//   npm install sharp --no-save          (chi can cai 1 lan)
//   node scripts/compress-images.mjs --dry-run     # xem truoc, KHONG ghi gi
//   node scripts/compress-images.mjs               # nen that
//
// Tuy chinh (khong bat buoc):
//   --max-width=1600   chieu rong toi da (px), anh to hon se bi thu nho
//   --quality=82       chat luong nen JPEG/WebP (1-100)
//
// AN TOAN: anh da duoc push len GitHub tu truoc, neu ket qua khong ung y
// van co the khoi phuc lai qua "git checkout -- public/anh1" (Git van
// giu ban goc trong lich su commit).

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const IMAGES_ROOT = path.join(ROOT, "public/anh1");
const SKIP_DIRS = new Set(["_debug", "_state"]);
const VALID_EXT = new Set([".jpg", ".jpeg", ".png", ".webp"]);

function parseArgs() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const maxWidthArg = args.find((a) => a.startsWith("--max-width="));
  const qualityArg = args.find((a) => a.startsWith("--quality="));
  const maxWidth = maxWidthArg ? parseInt(maxWidthArg.split("=")[1], 10) : 1600;
  const quality = qualityArg ? parseInt(qualityArg.split("=")[1], 10) : 82;
  return { dryRun, maxWidth, quality };
}

function walkImages(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      out.push(...walkImages(path.join(dir, entry.name)));
    } else if (VALID_EXT.has(path.extname(entry.name).toLowerCase())) {
      out.push(path.join(dir, entry.name));
    }
  }
  return out;
}

async function compressOne(filePath, { maxWidth, quality }) {
  const original = fs.readFileSync(filePath);
  const originalSize = original.length;
  const ext = path.extname(filePath).toLowerCase();

  let pipeline = sharp(original).rotate(); // rotate(): tu dong xoay theo EXIF
  const meta = await sharp(original).metadata();

  if (meta.width && meta.width > maxWidth) {
    pipeline = pipeline.resize({ width: maxWidth, withoutEnlargement: true });
  }

  let outBuffer;
  if (ext === ".jpg" || ext === ".jpeg") {
    outBuffer = await pipeline.jpeg({ quality, mozjpeg: true }).toBuffer();
  } else if (ext === ".webp") {
    outBuffer = await pipeline.webp({ quality }).toBuffer();
  } else if (ext === ".png") {
    // palette:true = luong tu hoa mau (giong pngquant), giam dung luong
    // rat manh cho anh chup san pham (khong can toi 16 trieu mau).
    outBuffer = await pipeline.png({ compressionLevel: 9, palette: true }).toBuffer();
  } else {
    return { skipped: true, originalSize, newSize: originalSize };
  }

  return { skipped: false, originalSize, newSize: outBuffer.length, outBuffer };
}

async function main() {
  const { dryRun, maxWidth, quality } = parseArgs();

  if (!fs.existsSync(IMAGES_ROOT)) {
    console.error(`Khong tim thay thu muc ${IMAGES_ROOT}`);
    process.exit(1);
  }

  const files = walkImages(IMAGES_ROOT);
  console.log(`Tim thay ${files.length} anh trong ${IMAGES_ROOT}`);
  console.log(`Cau hinh: max-width=${maxWidth}px, quality=${quality}${dryRun ? " (CHE DO XEM TRUOC)" : ""}\n`);

  let totalBefore = 0;
  let totalAfter = 0;
  let changed = 0;
  let keptAsIs = 0;
  let errors = 0;

  for (let i = 0; i < files.length; i++) {
    const filePath = files[i];
    const rel = path.relative(IMAGES_ROOT, filePath);
    try {
      const { skipped, originalSize, newSize, outBuffer } = await compressOne(filePath, { maxWidth, quality });
      totalBefore += originalSize;

      if (skipped) {
        totalAfter += originalSize;
        keptAsIs++;
        continue;
      }

      if (newSize < originalSize) {
        totalAfter += newSize;
        changed++;
        const pct = (100 - (newSize / originalSize) * 100).toFixed(0);
        if ((i + 1) % 50 === 0 || i === files.length - 1) {
          console.log(`[${i + 1}/${files.length}] ${rel}: -${pct}% (${(originalSize / 1024).toFixed(0)}KB -> ${(newSize / 1024).toFixed(0)}KB)`);
        }
        if (!dryRun) {
          fs.writeFileSync(filePath, outBuffer);
        }
      } else {
        // Nen ra to hon hoac bang ban goc -> giu nguyen, khong ghi de.
        totalAfter += originalSize;
        keptAsIs++;
      }
    } catch (e) {
      console.warn(`  Loi voi ${rel}: ${e?.message || e} - giu nguyen file goc.`);
      errors++;
    }
  }

  const savedMB = (totalBefore - totalAfter) / 1024 / 1024;
  const beforeMB = totalBefore / 1024 / 1024;
  const afterMB = totalAfter / 1024 / 1024;

  console.log(`\n${dryRun ? "[XEM TRUOC - CHUA GHI GI]" : "Da nen xong"}`);
  console.log(`  Da nen nho hon: ${changed} anh`);
  console.log(`  Giu nguyen (da toi uu hoac loi): ${keptAsIs} anh`);
  if (errors) console.log(`  Loi: ${errors} anh (xem log o tren)`);
  console.log(`  Tong dung luong: ${beforeMB.toFixed(1)}MB -> ${afterMB.toFixed(1)}MB (giam ${savedMB.toFixed(1)}MB, ~${((savedMB / beforeMB) * 100).toFixed(0)}%)`);
  if (dryRun) console.log("\nChay lai KHONG co --dry-run de ghi that vao file.");
}

main();