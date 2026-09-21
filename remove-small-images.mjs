#!/usr/bin/env node
// remove-small-images.mjs — tìm ảnh nhỏ (chiều rộng VÀ chiều cao đều <= 100px, ví dụ 77x100)
//
// Cài 1 lần:   npm i -D sharp
// Chạy:
//   node remove-small-images.mjs public\anh1            -> chỉ liệt kê (an toàn)
//   node remove-small-images.mjs public\anh1 --move     -> chuyển ảnh nhỏ sang _small-backup (chép ngược lại được)
//   node remove-small-images.mjs public\anh1 --delete   -> xóa hẳn (KHÔNG khôi phục được)
//   node remove-small-images.mjs public\anh1 --max=120  -> đổi ngưỡng (mặc định 100)
//
// Điều kiện xóa: rộng <= max VÀ cao <= max.
// Script cũng cảnh báo các thư mục mà TẤT CẢ ảnh đều nhỏ (xóa xong sản phẩm sẽ không còn ảnh nào).

import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const args = process.argv.slice(2);
const MOVE = args.includes("--move");
const DELETE = args.includes("--delete");
const maxArg = args.find((a) => a.startsWith("--max="));
const MAX = maxArg ? Number(maxArg.split("=")[1]) : 100;
const dir = path.resolve(args.find((a) => !a.startsWith("--")) || "public");
const root = process.cwd();
const backupRoot = path.resolve("_small-backup");

const IMG_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif"]);
const SKIP_DIRS = new Set(["node_modules", ".next", ".git", ".vercel", "_small-backup", "_dup-backup"]);

function* walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) {
      if (!SKIP_DIRS.has(e.name)) yield* walk(p);
    } else yield p;
  }
}

if (!fs.existsSync(dir)) {
  console.error("Không tìm thấy thư mục:", dir);
  process.exit(1);
}

let scanned = 0, failed = 0;
const small = []; // { file, w, h, size }
const perFolder = new Map(); // folder -> { total, small }

for (const f of walk(dir)) {
  if (!IMG_EXT.has(path.extname(f).toLowerCase())) continue;
  scanned++;
  const folder = path.dirname(f);
  if (!perFolder.has(folder)) perFolder.set(folder, { total: 0, small: 0 });
  const stat = perFolder.get(folder);
  stat.total++;
  try {
    const { width, height } = await sharp(f, { failOn: "none" }).metadata();
    if (width && height && width <= MAX && height <= MAX) {
      small.push({ file: f, w: width, h: height, size: fs.statSync(f).size });
      stat.small++;
    }
  } catch {
    failed++;
  }
}

if (!small.length) {
  console.log(`Quét ${scanned} ảnh (lỗi đọc: ${failed}) — không có ảnh nào <= ${MAX}x${MAX}.`);
  process.exit(0);
}

const bytes = small.reduce((s, x) => s + x.size, 0);
console.log(`Quét ${scanned} ảnh (lỗi đọc: ${failed}): ${small.length} ảnh <= ${MAX}x${MAX}, dung lượng ~${(bytes / 1048576).toFixed(1)} MB\n`);

for (const s of small) console.log(`${s.w}x${s.h}`.padEnd(9), path.relative(root, s.file));

// Cảnh báo thư mục sẽ không còn ảnh nào
const empty = [...perFolder.entries()].filter(([, v]) => v.small > 0 && v.small === v.total);
if (empty.length) {
  console.log(`\n⚠ ${empty.length} thư mục sẽ KHÔNG CÒN ẢNH nào sau khi xóa (mọi ảnh trong đó đều nhỏ):`);
  for (const [f] of empty.slice(0, 50)) console.log("  ", path.relative(root, f));
  if (empty.length > 50) console.log(`  ... và ${empty.length - 50} thư mục nữa`);
}

if (MOVE) {
  for (const s of small) {
    const dest = path.join(backupRoot, path.relative(root, s.file));
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.renameSync(s.file, dest);
  }
  console.log(`\nĐã chuyển ${small.length} ảnh sang ${path.relative(root, backupRoot)}\\. Nhớ thêm vào .gitignore.`);
} else if (DELETE) {
  for (const s of small) fs.unlinkSync(s.file);
  console.log(`\nĐã xóa hẳn ${small.length} ảnh.`);
} else {
  console.log("\n(Chế độ xem thử — chưa động vào file nào. Thêm --move hoặc --delete.)");
}
