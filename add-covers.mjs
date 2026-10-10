// Them truong image (anh bia) cho cac bai CHUA co anh bia, lay tu thu muc anh trong noi dung bai.
// Chay thu:  node add-covers.mjs      |  Ghi that: node add-covers.mjs --write
import fs from "node:fs";
import path from "node:path";

const WRITE = process.argv.includes("--write");
const root = process.cwd();
const publicDir = ["public", "client/public", "static"].map(d => path.join(root, d)).find(fs.existsSync);
const blogFile = ["src/data/blog.ts", "src/lib/blog.ts", "lib/blog.ts", "data/blog.ts", "blog.ts"]
  .map(f => path.join(root, f)).find(fs.existsSync);
if (!publicDir || !blogFile) { console.log("Khong tim thay public/ hoac blog.ts"); process.exit(1); }

const IMG = /\.(webp|jpe?g|png|avif)$/i;
const src = fs.readFileSync(blogFile, "utf8");
const parts = src.split(/(?=\n  \{\n    slug: ")/); // moi phan tu = 1 bai
let added = 0;

const out = parts.map(chunk => {
  const slug = chunk.match(/\n    slug: "([^"]+)"/)?.[1];
  if (!slug || /\n    image:/.test(chunk)) return chunk;

  // thu muc anh = thu muc cua anh dau tien (khong phai blob/http) trong noi dung
  const first = [...chunk.matchAll(/src=\\?'(\/[^']+?)\\?'/g)].map(m => m[1]).find(u => IMG.test(u));
  if (!first) { console.log("BO QUA (khong co anh trong bai):", slug); return chunk; }
  const dirWeb = path.posix.dirname(first);
  const dirFs = path.join(publicDir, dirWeb);
  if (!fs.existsSync(dirFs)) { console.log("BO QUA (thu muc khong ton tai):", dirWeb); return chunk; }

  const files = fs.readdirSync(dirFs).filter(f => IMG.test(f)).sort();
  const pick = files.find(f => /cover/i.test(f)) || files.find(f => /section-1/i.test(f)) || files[0];
  if (!pick) { console.log("BO QUA (thu muc rong):", dirWeb); return chunk; }

  const cover = `${dirWeb}/${pick}`;
  console.log("THEM bia:", slug.slice(0, 60), "\n   ->", cover);
  added++;
  return chunk.replace(/(\n    slug: "[^"]+",)/, `$1\n    image: "${cover}",`);
}).join("");

console.log(`\nSe them ${added} anh bia.`);
if (WRITE && added) {
  fs.copyFileSync(blogFile, blogFile + ".bak2");
  fs.writeFileSync(blogFile, out, "utf8");
  console.log("Da ghi", blogFile, "(backup: .bak2)");
} else if (!WRITE) console.log("(Chua ghi. Them --write de ap dung.)");
