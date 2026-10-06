// Chay: node audit-images.mjs   (dat file nay o goc project, canh thu muc public/)
// Liet ke MOI duong dan anh trong blog.ts va bao file nao khong ton tai trong public/
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const publicDir = ["public", "client/public", "static"].map(d => path.join(root, d)).find(fs.existsSync);
const blogFile = ["src/data/blog.ts", "src/lib/blog.ts", "lib/blog.ts", "data/blog.ts", "blog.ts"]
  .map(f => path.join(root, f)).find(fs.existsSync);
if (!publicDir || !blogFile) { console.log("Khong tim thay public/ hoac blog.ts - sua mang duong dan trong file nay."); process.exit(1); }

const src = fs.readFileSync(blogFile, "utf8");
const urls = new Set([
  ...[...src.matchAll(/src=\\?'([^']+?)\\?'/g)].map(m => m[1]),
  ...[...src.matchAll(/image:\s*"([^"]+)"/g)].map(m => m[1]),
]);

const ok = [], missing = [], bad = [];
for (const u of urls) {
  if (u.startsWith("blob:")) { bad.push([u, "blob: URL tam - phai bo"]); continue; }
  if (/^https?:/.test(u)) { continue; }
  const f = path.join(publicDir, u.split("?")[0]);
  if (!fs.existsSync(f)) { missing.push(u); continue; }
  if (fs.statSync(f).isDirectory()) { bad.push([u, "la THU MUC, khong phai file anh"]); continue; }
  ok.push(u);
}
console.log(`public dir: ${publicDir}\nOK: ${ok.length} | THIEU: ${missing.length} | SAI: ${bad.length}\n`);
missing.forEach(u => console.log("THIEU  ", u));
bad.forEach(([u, why]) => console.log("SAI    ", u.slice(0, 110), "->", why));
