// Doi `formatPrice` trong cac component chay o TRINH DUYET ("use client") sang
// import tu "@/lib/format", de chung khong keo ca file du lieu san pham
// (src/data/products.ts, ~8MB) vao JavaScript tai ve may khach.
//
// Chay tai thu muc goc project:  node scripts/fix-client-imports.mjs
// (chay lai an toan; chi sua dong import, khong dong vao phan code khac)
// Cuoi cung in ra cac component "use client" van import DU LIEU THAT tu
// @/data/products (vd products, categories) - gui danh sach do cho Claude.
import fs from "node:fs";
import path from "node:path";

const SRC = path.join(process.cwd(), "src");
const IMPORT_RE = /import\s*\{([^}]*)\}\s*from\s*(["'])((?:@\/|(?:\.\.?\/)+)data\/products)\2;?/g;
const TYPE_NAMES = new Set(["Product", "Category", "CardProduct"]);

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(tsx?|jsx?)$/.test(e.name)) out.push(p);
  }
  return out;
}

const isClient = (text) => /^\s*(?:\/\/[^\n]*\n|\/\*[\s\S]*?\*\/\s*)*["']use client["']/.test(text);

let changed = 0;
const stillData = [];

for (const file of walk(SRC)) {
  const text = fs.readFileSync(file, "utf8");
  if (!isClient(text)) continue;
  const eol = text.includes("\r\n") ? "\r\n" : "\n";
  let touched = false;

  let next = text.replace(IMPORT_RE, (whole, specs, q, from) => {
    const names = specs.split(",").map((s) => s.trim()).filter(Boolean);
    const rest = names.filter((n) => n !== "formatPrice");
    const hadFormat = rest.length !== names.length;
    const values = rest.filter((n) => !TYPE_NAMES.has(n.replace(/^type\s+/, "")) && !n.startsWith("type "));
    if (values.length) stillData.push(`${path.relative(process.cwd(), file)}: ${values.join(", ")}`);
    if (!hadFormat) return whole;
    touched = true;
    const fmt = `import { formatPrice } from "@/lib/format";`;
    if (!rest.length) return fmt;
    return `import { ${rest.join(", ")} } from ${q}${from}${q};${eol}${fmt}`;
  });

  if (touched) {
    fs.writeFileSync(file, next, "utf8");
    changed++;
    console.log("Da sua: " + path.relative(process.cwd(), file));
  }
}

console.log(`\nXong. Da sua ${changed} file.`);
if (stillData.length) {
  console.log("\nCac component 'use client' van import DU LIEU tu @/data/products (se bi nhet vao JS trinh duyet):");
  stillData.forEach((l) => console.log("  - " + l));
} else {
  console.log("Khong con component trinh duyet nao import du lieu san pham.");
}
