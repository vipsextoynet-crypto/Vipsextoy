// Chay thu (chi bao cao):  node fix-images.mjs
// Sua that (co backup):    node fix-images.mjs --write
import fs from "node:fs";
import path from "node:path";

const WRITE = process.argv.includes("--write");
const root = process.cwd();
const publicDir = ["public", "client/public", "static"].map(d => path.join(root, d)).find(fs.existsSync);
const blogFile = ["src/data/blog.ts", "src/lib/blog.ts", "lib/blog.ts", "data/blog.ts", "blog.ts"]
  .map(f => path.join(root, f)).find(fs.existsSync);
if (!publicDir || !blogFile) { console.log("Khong tim thay public/ hoac blog.ts"); process.exit(1); }

const IMG = /\.(webp|jpe?g|png|avif|gif)$/i;
const all = []; // duong dan web cua moi file anh trong public
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (IMG.test(e.name)) all.push("/" + path.relative(publicDir, p).split(path.sep).join("/"));
  }
})(publicDir);

// So khop bo qua chu "d" (vi slug cu da lam mat chu d/đ)
const key = u => path.posix.basename(u).replace(/\.[^.]+$/, "").replace(/d/g, "");
const byKey = new Map();
for (const f of all) { const k = key(f); (byKey.get(k) || byKey.set(k, []).get(k)).push(f); }

let src = fs.readFileSync(blogFile, "utf8");
const exists = u => fs.existsSync(path.join(publicDir, u.split("?")[0]));
const isDir = u => exists(u) && fs.statSync(path.join(publicDir, u)).isDirectory();
const report = { fixed: [], unresolved: [] };

function resolve(u) {
  if (/^(https?:|blob:)/.test(u)) return null;
  if (isDir(u)) { // anh bia tro vao thu muc -> chon file *cover* hoac file dau tien
    const files = all.filter(f => f.startsWith(u.replace(/\/$/, "") + "/")).sort();
    return files.find(f => /cover/i.test(f)) || files[0] || null;
  }
  if (exists(u)) return null;
  const c = byKey.get(key(u));
  return c && c.length === 1 ? c[0] : (c ? c.sort()[0] : null);
}

src = src.replace(/(src=\\?')([^']+?)(\\?')|(image:\s*")([^"]+)(")/g, (m, a1, u1, a3, b1, u2, b3) => {
  const u = u1 ?? u2;
  if (/^(https?:|blob:)/.test(u) || (exists(u) && !isDir(u))) return m;
  const r = resolve(u);
  if (r) { report.fixed.push([u, r]); return u1 !== undefined ? a1 + r + a3 : b1 + r + b3; }
  report.unresolved.push(u);
  return m;
});

console.log(`Tim thay ${all.length} file anh trong public/`);
console.log(`\nSE SUA ${report.fixed.length} duong dan:`);
report.fixed.forEach(([a, b]) => console.log("  " + a.slice(-70) + "\n   -> " + b));
console.log(`\nKHONG TIM THAY FILE (can tao lai/upload anh) ${report.unresolved.length}:`);
report.unresolved.forEach(u => console.log("  " + u));

if (WRITE) {
  fs.copyFileSync(blogFile, blogFile + ".bak");
  fs.writeFileSync(blogFile, src, "utf8");
  console.log(`\nDa ghi ${blogFile} (backup: ${blogFile}.bak)`);
} else console.log("\n(Chua ghi gi. Them --write de ap dung.)");
