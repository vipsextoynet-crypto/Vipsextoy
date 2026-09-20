import fs from "fs";
import path from "path";

// Hàm hỗ trợ xóa chuỗi 6 ký tự mã hex kèm dấu gạch ngang ở đầu slug (VD: dc72e1-)
function fixSlug(slug) {
  if (!slug) return "";
  return slug.replace(/^[a-f0-9]{6}-/i, "");
}

// Kiểm tra vị trí file sản phẩm ở cả src/data/products.ts và data/products.ts
let targetPath = path.resolve("src/data/products.ts");

if (!fs.existsSync(targetPath)) {
  targetPath = path.resolve("data/products.ts");
}

if (!fs.existsSync(targetPath)) {
  console.error("❌ Không tìm thấy file products.ts trong dự án!");
  process.exit(1);
}

console.log(`🔍 Đang xử lý file: ${targetPath}`);

let content = fs.readFileSync(targetPath, "utf-8");

// Tìm và sửa tất cả thuộc tính slug
let count = 0;
const updatedContent = content.replace(/slug:\s*["']([^"']+)["']/g, (match, oldSlug) => {
  const newSlug = fixSlug(oldSlug);
  if (oldSlug !== newSlug) {
    count++;
  }
  return `slug: "${newSlug}"`;
});

fs.writeFileSync(targetPath, updatedContent, "utf-8");
console.log(`✅ Đã làm sạch thành công ${count} đường link slug trong file products.ts!`);