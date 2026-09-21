#!/usr/bin/env node
// dedupe-images.mjs — tìm và xóa ảnh trùng (giống hệt nội dung) trong thư mục public/
//
// Cách dùng (chạy ở thư mục gốc của project, không cần cài thêm gì):
//   node dedupe-images.mjs                 -> chỉ LIỆT KÊ ảnh trùng (an toàn, không xóa)
//   node dedupe-images.mjs --fix-refs      -> liệt kê + cho biết code nào đang trỏ tới bản trùng
//   node dedupe-images.mjs --delete        -> xóa bản trùng, tự sửa đường dẫn trong code sang bản giữ lại
//   node dedupe-images.mjs public/images   -> chỉ định thư mục ảnh khác (mặc định: public)
//
// Bản được giữ lại: đường dẫn ngắn nhất (nếu bằng nhau thì theo thứ tự chữ cái).

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const args = process.argv.slice(2);
const DELETE = args.includes("--delete");
const FIX_REFS = DELETE || args.includes("--fix-refs");
const imgDir = path.resolve(args.find((a) => !a.startsWith("--")) || "public");
const root = process.cwd();
const publicDir = path.resolve("public");

const IMG_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif", ".svg"]);
const TEXT_EXT = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".json", ".md", ".mdx", ".css", ".html"]);
const SKIP_DIRS = new Set(["node_modules", ".next", ".git", ".vercel", "out", "dist"]);

function* walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (!SKIP_DIRS.has(e.name)) yield* walk(p);
    } else yield p;
  }
}

const fmt = (b) => (b / 1024 / 1024).toFixed(2) + " MB";
const toUrl = (p) => "/" + path.relative(publicDir, p).split(path.sep).join("/");

if (!fs.existsSync(imgDir)) {
  console.error("Không tìm thấy thư mục:", imgDir);
  process.exit(1);
}

// 1. Gom nhóm ảnh theo hash nội dung
const groups = new Map();
let total = 0;
for (const f of walk(imgDir)) {
  if (!IMG_EXT.has(path.extname(f).toLowerCase())) continue;
  total++;
  const hash = crypto.createHash("sha256").update(fs.readFileSync(f)).digest("hex");
  if (!groups.has(hash)) groups.set(hash, []);
  groups.get(hash).push(f);
}

const dupGroups = [...groups.values()].filter((g) => g.length > 1);
if (!dupGroups.length) {
  console.log(`Quét ${total} ảnh — không có ảnh trùng.`);
  process.exit(0);
}

// 2. Chọn bản giữ lại, lập danh sách bản cần xóa
const plan = []; // { keep, remove: [] }
let savedBytes = 0;
let removeCount = 0;
for (const g of dupGroups) {
  g.sort((a, b) => a.length - b.length || a.localeCompare(b));
  const [keep, ...remove] = g;
  const size = fs.statSync(keep).size;
  savedBytes += size * remove.length;
  removeCount += remove.length;
  plan.push({ keep, remove });
}

console.log(`Quét ${total} ảnh: ${dupGroups.length} nhóm trùng, ${removeCount} file thừa, tiết kiệm ~${fmt(savedBytes)}\n`);
for (const { keep, remove } of plan) {
  console.log("GIỮ :", path.relative(root, keep));
  for (const r of remove) console.log("  xóa:", path.relative(root, r));
}

// 3. Tìm / sửa các chỗ trong code còn trỏ tới bản trùng
if (FIX_REFS) {
  const replacements = [];
  for (const { keep, remove } of plan)
    for (const r of remove) replacements.push([toUrl(r), toUrl(keep)]);

  console.log("\n--- Tham chiếu trong code ---");
  let touched = 0;
  for (const f of walk(root)) {
    if (!TEXT_EXT.has(path.extname(f).toLowerCase())) continue;
    let text = fs.readFileSync(f, "utf8");
    let changed = false;
    for (const [from, to] of replacements) {
      if (text.includes(from)) {
        console.log(`${path.relative(root, f)}: ${from} -> ${to}`);
        if (DELETE) {
          text = text.split(from).join(to);
          changed = true;
        }
      }
    }
    if (changed) {
      fs.writeFileSync(f, text);
      touched++;
    }
  }
  if (DELETE) console.log(`Đã sửa ${touched} file.`);
}

// 4. Xóa
if (DELETE) {
  for (const { remove } of plan) for (const r of remove) fs.unlinkSync(r);
  console.log(`\nĐã xóa ${removeCount} file trùng. Hãy chạy thử \`npm run build\` rồi commit.`);
} else {
  console.log("\n(Chế độ xem thử — chưa xóa gì. Thêm --delete để xóa thật.)");
}
