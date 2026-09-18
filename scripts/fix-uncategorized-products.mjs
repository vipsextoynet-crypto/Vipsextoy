// scripts/fix-uncategorized-products.mjs
//
// Phan loai lai cac san pham dang nam trong danh muc "Chua phan loai"
// (categorySlug: "chua-phan-loai") dua theo tu khoa trong ten san pham,
// gan vao 1 trong cac danh muc CO SAN (khong tao danh muc moi):
//   - Chua "nuoc hoa" -> Nuoc Hoa Kich Thich (nuoc-hoa-kich-thich)
//   - Chua "svakom"   -> Svakom (svakom)
//   - Chua "gay"      -> Do Choi Cho LGBT (do-choi-cho-lgbt)
//
// CO CHU DINH BO QUA 14 san pham dang "thuoc/nuoc kich duc" dang uong/bot
// va chai hit popper - xem danh sach SKIP_SKUS ben duoi va ly do trong
// scripts/UNCATEGORIZED_REVIEW.md. Nhung san pham nay se giu nguyen trong
// "Chua phan loai" cho ban tu quyet dinh (khuyen nghi: xem lai co nen tiep
// tuc ban khong, thay vi chi gan danh muc).
//
// CACH DUNG
//   node scripts/fix-uncategorized-products.mjs --dry-run
//   node scripts/fix-uncategorized-products.mjs        (ghi that)
//
// An toan: tu sao luu products.ts.bak-uncategorized truoc khi ghi de.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PRODUCTS_PATH = path.join(ROOT, "src/data/products.ts");
const BACKUP_PATH = path.join(ROOT, "src/data/products.ts.bak-uncategorized");

// SKU co chu dich KHONG dong bo - xem ly do o dau file.
const SKIP_SKUS = new Set([
  "KT37", "KT38", "KT39",
  "THUOC-KICH-DUC-NU-SUPER-D-MANH-NHAT",
  "NUOC-KICH-DUC-NU-USA-SIEU-MANH-LADY-ERA",
  "THUOC-DANG-NUOC-CUA-DUC-BLACK-WINDOW",
  "THUOC-CHO-NU-DANG-BOT-EXCITEMENT-MY",
  "THUOC-DANG-NUOC-CHO-NU-GOLD-FLY-TAY-BAN-NHA",
  "THUOC-DANG-NUOC-PHILTER-CUA-MY",
  "THUOC-DANG-NUOC-RED-SPIDER",
  "THUOC-NHAT-UNISEX-DANG-NUOC",
  "THUOC-DANG-NUOC-CUA-DUC-BLACK-WINDOW-2",
  "THUOC-DANG-VIEN-WOMAN-HIEU-QUA-CAO",
  "Vinix 100mg",
]);

function classify(name) {
  const n = name.normalize("NFC").toLowerCase();
  if (n.includes("nước hoa") || n.includes("nuoc hoa")) {
    return { slug: "nuoc-hoa-kich-thich", name: "Nước Hoa Kích Thích" };
  }
  if (n.includes("svakom")) {
    return { slug: "svakom", name: "Svakom" };
  }
  if (n.includes("gay")) {
    return { slug: "do-choi-cho-lgbt", name: "Đồ Chơi Cho LGBT" };
  }
  return null;
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

function setCategoryFields(blockText, categorySlug, categoryName) {
  let next = blockText;
  next = next.replace(/category:\s*"(?:[^"\\]|\\.)*"/, `category: "${categoryName}"`);
  next = next.replace(/categorySlug:\s*"(?:[^"\\]|\\.)*"/, `categorySlug: "${categorySlug}"`);
  return next;
}

function main() {
  const dryRun = process.argv.includes("--dry-run");
  let source = fs.readFileSync(PRODUCTS_PATH, "utf8");
  const blocks = splitProductBlocks(source);

  let offsetShift = 0;
  let moved = 0;
  const movedLog = [];
  const skippedLog = [];
  const stillUnmatchedLog = [];

  for (const block of blocks) {
    const sku = extractField(block.text, "sku");
    if (!sku) continue;
    const categorySlug = extractField(block.text, "categorySlug");
    if (categorySlug !== "chua-phan-loai") continue;

    const name = extractField(block.text, "name") || "";

    if (SKIP_SKUS.has(sku)) {
      skippedLog.push(`${sku} | ${name}`);
      continue;
    }

    const target = classify(name);
    if (!target) {
      stillUnmatchedLog.push(`${sku} | ${name}`);
      continue;
    }

    const newBlockText = setCategoryFields(block.text, target.slug, target.name);
    movedLog.push(`${sku} -> ${target.name} | ${name}`);

    if (!dryRun) {
      const realStart = block.start + offsetShift;
      const realEnd = block.end + offsetShift;
      source = source.slice(0, realStart) + newBlockText + source.slice(realEnd);
      offsetShift += newBlockText.length - block.text.length;
    }
    moved++;
  }

  console.log(`${dryRun ? "[XEM TRUOC]" : "Da chuyen"} ${moved} sản phẩm sang danh mục đúng:\n`);
  movedLog.forEach((l) => console.log("  " + l));

  console.log(`\nGiữ nguyên trong "Chưa phân loại" - CẦN BẠN TỰ XEM XÉT (${skippedLog.length} sản phẩm, thuốc/nước kích dục dạng uống + popper):`);
  skippedLog.forEach((l) => console.log("  " + l));

  if (stillUnmatchedLog.length) {
    console.log(`\nKhông khớp từ khoá nào (giữ nguyên, cần bạn phân loại tay): ${stillUnmatchedLog.length}`);
    stillUnmatchedLog.forEach((l) => console.log("  " + l));
  }

  console.log(
    `\nLưu ý: danh mục "Chưa phân loại" sẽ CÒN LẠI ${skippedLog.length + stillUnmatchedLog.length} sản phẩm sau khi chạy script này - đây là chủ đích, không phải lỗi sót. Chỉ xoá hẳn danh mục này khỏi menu khi bạn đã quyết định xong với các sản phẩm còn lại.`
  );

  if (!dryRun && moved > 0) {
    if (!fs.existsSync(BACKUP_PATH)) {
      fs.copyFileSync(PRODUCTS_PATH, BACKUP_PATH);
      console.log(`\nĐã sao lưu bản gốc vào ${BACKUP_PATH}`);
    }
    fs.writeFileSync(PRODUCTS_PATH, source, "utf8");
    console.log("Đã ghi vào src/data/products.ts");
  } else if (dryRun) {
    console.log("\nChạy lại KHÔNG có --dry-run để ghi thật vào file.");
  }
}

main();
