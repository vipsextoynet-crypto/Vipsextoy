import fs from "node:fs";
import path from "node:path";

const file = path.resolve("src/data/products.ts");
const KEYWORD_RE = /âm\s*đạo/i;

if (!fs.existsSync(file)) {
  console.error(`Không tìm thấy file: ${file}`);
  process.exit(1);
}

let source = fs.readFileSync(file, "utf8");

// Product objects are top-level entries inside `export const products`.
const marker = "export const products: Product[] = [";
const start = source.indexOf(marker);

if (start === -1) {
  console.error("Không tìm thấy `export const products: Product[] = [`. ");
  process.exit(1);
}

const before = source.slice(0, start + marker.length);
const rest = source.slice(start + marker.length);

// Split only at top-level product entries. The product data currently uses
// two-space indentation for each object.
const parts = rest.split(/\n(?=  \{\n)/);
let changed = 0;
let matched = 0;

const updatedParts = parts.map((part) => {
  const nameMatch = part.match(
    /^\s*\{\n(?:[\s\S]*?\n)?\s*name:\s*"([^"]*)"/
  );

  if (!nameMatch) return part;

  const name = nameMatch[1];

  if (!KEYWORD_RE.test(name)) return part;

  matched++;

  // If sensitive already exists, force it to true.
  if (/\n\s*sensitive:\s*(?:true|false),?/.test(part)) {
    const next = part.replace(
      /(\n\s*sensitive:\s*)(?:true|false)(,?)/,
      "$1true$2"
    );

    if (next !== part) changed++;

    return next;
  }

  // Otherwise insert the flag immediately before longDescription.
  if (/\n\s*longDescription\s*:/.test(part)) {
    changed++;

    return part.replace(
      /(\n\s*longDescription\s*:)/,
      "\n    sensitive: true,$1"
    );
  }

  // Fallback: insert before the end of this product object.
  const end = part.lastIndexOf("\n  },");

  if (end !== -1) {
    changed++;

    return (
      part.slice(0, end) +
      "\n    sensitive: true," +
      part.slice(end)
    );
  }

  return part;
});

if (changed > 0) {
  fs.writeFileSync(
    file,
    before + updatedParts.join("\n"),
    "utf8"
  );
}

console.log(`Tìm thấy ${matched} sản phẩm có từ khóa "Âm đạo".`);
console.log(`Đã đánh dấu sensitive: true cho ${changed} sản phẩm.`);

if (changed === 0) {
  console.log("Không có thay đổi nào.");
}
