// Sua loi: vong lap cap module trong src/data/products.ts khien TOAN BO du lieu
// san pham (~11MB) bi nhet vao JavaScript phia trinh duyet (Header/ProductCard
// chi can formatPrice nhung bi keo theo ca mang products).
// Cach chay: node scripts/fix-products-treeshake.mjs   (chay lai an toan)
import fs from "node:fs";

const FILE = "src/data/products.ts";
let s = fs.readFileSync(FILE, "utf8");
const eol = s.includes("\r\n") ? "\r\n" : "\n";
const norm = (t) => t.replace(/\n/g, eol);

const oldBlock = norm(`const legacySlugMap = new Map<string, Product>();
for (const p of products) if (p.legacySlug) legacySlugMap.set(p.legacySlug, p);

export function getProductByLegacySlug(slug: string) {
  return legacySlugMap.get(slug);
}`);

const newBlock = norm(`// Map tao luc goi lan dau (lazy) - KHONG dat vong lap o cap module, neu khong
// bundler khong the loai mang products khoi JS phia trinh duyet.
let legacySlugMap: Map<string, Product> | undefined;

export function getProductByLegacySlug(slug: string) {
  if (!legacySlugMap) {
    legacySlugMap = new Map();
    for (const p of products) if (p.legacySlug) legacySlugMap.set(p.legacySlug, p);
  }
  return legacySlugMap.get(slug);
}`);

if (s.includes("let legacySlugMap")) {
  console.log("Da sua truoc do, khong can lam gi.");
} else if (s.split(oldBlock).length === 2) {
  fs.writeFileSync(FILE, s.replace(oldBlock, () => newBlock), "utf8");
  console.log("Da sua xong src/data/products.ts");
} else {
  console.error("Khong tim thay doan code can sua - gui lai cho Claude cuoi file products.ts (30 dong cuoi).");
  process.exit(1);
}
