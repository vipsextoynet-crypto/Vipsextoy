import { Product } from "@/data/products";

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function tsString(value: string): string {
  return JSON.stringify(value);
}

function tsStringArray(values: string[]): string {
  return `[${values.map(tsString).join(", ")}]`;
}

// Chuyen 1 Product thanh doan code TS y nhu cac object co san trong
// products.ts, de chen vao file bang text (khong can parse/eval file).
export function productToTs(p: Product): string {
  const lines: string[] = [];
  lines.push("  {");
  lines.push(`    slug: ${tsString(p.slug)},`);
  lines.push(`    sku: ${tsString(p.sku)},`);
  lines.push(`    name: ${tsString(p.name)},`);
  lines.push(`    category: ${tsString(p.category)},`);
  lines.push(`    categorySlug: ${tsString(p.categorySlug)},`);
  lines.push(`    price: ${p.price},`);
  if (p.compareAt) lines.push(`    compareAt: ${p.compareAt},`);
  lines.push(`    blurb: ${tsString(p.blurb)},`);
  lines.push(`    description: ${tsString(p.description)},`);
  lines.push(`    features: ${tsStringArray(p.features)},`);
  lines.push(`    icon: ${tsString(p.icon)},`);
  if (p.badge) lines.push(`    badge: ${tsString(p.badge)},`);
  if (p.image) lines.push(`    image: ${tsString(p.image)},`);
  if (p.images && p.images.length > 0) {
    lines.push(`    images: ${tsStringArray(p.images)},`);
  }
  if (p.sensitive) lines.push(`    sensitive: true,`);
  lines.push("  },");
  return lines.join("\n");
}

// Chen doan code 1 san pham moi vao ngay truoc dau "];" ket thuc mang
// `products`, giu nguyen toan bo phan con lai cua file.
// Khong phu thuoc kieu xuong dong (LF hay CRLF) va khoang trong giua "];" va
// "export function getProduct" - file tren GitHub thuong bi doi sang CRLF khi
// push tu Windows nen khong duoc so khop chuoi cung.
export function insertProductIntoSource(source: string, productTs: string): string {
  const nl = source.includes("\r\n") ? "\r\n" : "\n";

  let idx = -1;
  const fnIdx = source.indexOf("export function getProduct");
  if (fnIdx !== -1) {
    idx = source.lastIndexOf("];", fnIdx);
  }
  if (idx === -1) {
    // Du phong: dau "];" o dau dong cuoi cung trong file.
    const m = [...source.matchAll(/^\];/gm)].pop();
    if (m && m.index !== undefined) idx = m.index;
  }

  if (idx === -1) {
    throw new Error("Không tìm thấy vị trí kết thúc mảng products trong file.");
  }

  const block = productTs.replace(/\r?\n/g, nl);
  return source.slice(0, idx) + block + nl + source.slice(idx);
}

// Tim vi tri bat dau/ket thuc cua 1 object san pham trong file, dua vao
// slug. Dua vao thuc te: TOAN BO 1913 san pham trong file deu duoc viet
// theo dung khuon "  {" ... "  }," (thut le 2 dau cach) nen tim nguoc/tien
// tu dong chua slug la an toan, khong can parse ca file nhu 1 chuong trinh.
function findProductBlock(source: string, slug: string): { start: number; end: number } {
  const slugLine = `slug: ${JSON.stringify(slug)},`;
  const slugIdx = source.indexOf(slugLine);

  if (slugIdx === -1) {
    throw new Error(`Không tìm thấy sản phẩm với slug "${slug}".`);
  }

  const start = source.lastIndexOf("\n  {", slugIdx);
  const closeMarker = "\n  },";
  const closeIdx = source.indexOf(closeMarker, slugIdx);

  if (start === -1 || closeIdx === -1) {
    throw new Error(`Không xác định được ranh giới object cho sản phẩm "${slug}".`);
  }

  return { start: start + 1, end: closeIdx + closeMarker.length };
}

export function replaceProductInSource(source: string, slug: string, productTs: string): string {
  const { start, end } = findProductBlock(source, slug);
  return source.slice(0, start) + productTs.trimEnd() + source.slice(end);
}

export function removeProductFromSource(source: string, slug: string): string {
  const { start, end } = findProductBlock(source, slug);
  // Xoa ca dong trong (newline) ngay truoc block de khong de lai dong rong.
  return source.slice(0, start) + source.slice(end);
}
