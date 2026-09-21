#!/usr/bin/env node
// dedupe-similar.mjs — tìm ảnh NHÌN GIỐNG NHAU (dù file khác byte: lưu lại, nén lại, đổi kích thước...)
//
// Cài 1 lần:   npm i -D sharp
// Chạy:
//   node dedupe-similar.mjs public\anh1              -> chỉ liệt kê (an toàn)
//   node dedupe-similar.mjs public\anh1 --move       -> chuyển bản thừa sang thư mục _dup-backup (không mất hẳn)
//   node dedupe-similar.mjs public\anh1 --threshold=8 -> nới độ giống (mặc định 6, thang 0-64; càng cao càng dễ nhận nhầm)
//
// Chỉ so sánh các ảnh NẰM CÙNG MỘT THƯ MỤC (vd cùng thư mục AD06C), nên không nhầm giữa các sản phẩm.
// Trong mỗi nhóm giống nhau, giữ file có dung lượng lớn nhất (thường là bản nét nhất).

import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const args = process.argv.slice(2);
const MOVE = args.includes("--move");
const thArg = args.find((a) => a.startsWith("--threshold="));
const THRESHOLD = thArg ? Number(thArg.split("=")[1]) : 6;
const dir = path.resolve(args.find((a) => !a.startsWith("--")) || "public");
const root = process.cwd();
const backupRoot = path.resolve("_dup-backup");

const IMG_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif"]);
const SKIP_DIRS = new Set(["node_modules", ".next", ".git", ".vercel", "_dup-backup"]);

function* walkDirs(d) {
  yield d;
  for (const e of fs.readdirSync(d, { withFileTypes: true }))
    if (e.isDirectory() && !SKIP_DIRS.has(e.name)) yield* walkDirs(path.join(d, e.name));
}

// dHash 64-bit: thu nhỏ về 9x8 xám, so sánh điểm ảnh kề nhau -> 2 số 32-bit
async function dhash(file) {
  const buf = await sharp(file, { failOn: "none" })
    .flatten({ background: "#ffffff" }) // ảnh nền trong suốt -> nền trắng
    .grayscale()
    .resize(9, 8, { fit: "fill" })
    .raw()
    .toBuffer();
  let hi = 0, lo = 0;
  for (let y = 0; y < 8; y++)
    for (let x = 0; x < 8; x++) {
      const bit = buf[y * 9 + x] > buf[y * 9 + x + 1] ? 1 : 0;
      const i = y * 8 + x;
      if (i < 32) hi = (hi << 1) | bit;
      else lo = (lo << 1) | bit;
    }
  return [hi >>> 0, lo >>> 0];
}

const pop = (n) => {
  n = n - ((n >>> 1) & 0x55555555);
  n = (n & 0x33333333) + ((n >>> 2) & 0x33333333);
  return (((n + (n >>> 4)) & 0x0f0f0f0f) * 0x01010101) >>> 24;
};
const dist = (a, b) => pop((a[0] ^ b[0]) >>> 0) + pop((a[1] ^ b[1]) >>> 0);

let scanned = 0, failed = 0;
const groupsAll = []; // mỗi nhóm: mảng {file,size,dist}

for (const d of walkDirs(dir)) {
  const files = fs
    .readdirSync(d, { withFileTypes: true })
    .filter((e) => e.isFile() && IMG_EXT.has(path.extname(e.name).toLowerCase()))
    .map((e) => path.join(d, e.name));
  if (files.length < 2) { scanned += files.length; continue; }

  const items = [];
  for (const f of files) {
    scanned++;
    try {
      items.push({ file: f, size: fs.statSync(f).size, h: await dhash(f) });
    } catch {
      failed++;
    }
  }

  // gom nhóm bằng union-find
  const parent = items.map((_, i) => i);
  const find = (i) => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  for (let i = 0; i < items.length; i++)
    for (let j = i + 1; j < items.length; j++)
      if (dist(items[i].h, items[j].h) <= THRESHOLD) parent[find(i)] = find(j);

  const map = new Map();
  items.forEach((it, i) => {
    const r = find(i);
    if (!map.has(r)) map.set(r, []);
    map.get(r).push(it);
  });
  for (const g of map.values()) if (g.length > 1) groupsAll.push(g);
}

if (!groupsAll.length) {
  console.log(`Quét ${scanned} ảnh (lỗi đọc: ${failed}) — không thấy ảnh giống nhau ở ngưỡng ${THRESHOLD}.`);
  console.log("Thử tăng ngưỡng: --threshold=8");
  process.exit(0);
}

let removeCount = 0, savedBytes = 0;
const plan = groupsAll.map((g) => {
  g.sort((a, b) => b.size - a.size || a.file.localeCompare(b.file));
  const [keep, ...remove] = g;
  removeCount += remove.length;
  savedBytes += remove.reduce((s, r) => s + r.size, 0);
  return { keep, remove };
});

console.log(`Quét ${scanned} ảnh (lỗi đọc: ${failed}): ${plan.length} nhóm giống nhau, ${removeCount} file thừa, tiết kiệm ~${(savedBytes / 1048576).toFixed(1)} MB\n`);
for (const { keep, remove } of plan) {
  console.log("GIỮ :", path.relative(root, keep.file), `(${(keep.size / 1024).toFixed(0)} KB)`);
  for (const r of remove)
    console.log("  thừa:", path.relative(root, r.file), `(${(r.size / 1024).toFixed(0)} KB, lệch ${dist(keep.h, r.h)}/64)`);
}

if (MOVE) {
  for (const { remove } of plan)
    for (const r of remove) {
      const dest = path.join(backupRoot, path.relative(root, r.file));
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.renameSync(r.file, dest);
    }
  console.log(`\nĐã chuyển ${removeCount} file sang ${path.relative(root, backupRoot)}\\ (có thể chép ngược lại nếu cần).`);
  console.log("Nhớ thêm _dup-backup vào .gitignore, rồi chạy thử site trước khi commit.");
} else {
  console.log("\n(Chế độ xem thử — chưa động vào file nào. Thêm --move để chuyển bản thừa đi.)");
}
