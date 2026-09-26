import fs from "node:fs";

const blogFile = "src/data/blog.ts";
const imageDir = "public/anhblog";

let source = fs.readFileSync(blogFile, "utf8");

// Lấy slug của bài viết
const slugMatch = source.match(/slug:\s*"([^"]+)"/);

if (!slugMatch) {
  throw new Error("Không tìm thấy slug trong blog.ts");
}

const slug = slugMatch[1];

// Tìm ảnh Base64 JPEG đã có sẵn trong content
const imageMatch = source.match(
  /data:image\/jpeg;base64,([A-Za-z0-9+/=]+)/
);

if (!imageMatch) {
  throw new Error("Không tìm thấy ảnh Base64 JPEG trong bài viết");
}

const imageBase64 = imageMatch[1];

// Tạo thư mục ảnh nếu chưa có
fs.mkdirSync(imageDir, { recursive: true });

// Tên file ảnh public
const imageFile = `${slug}.jpg`;
const imagePath = `${imageDir}/${imageFile}`;

// Ghi ảnh ra file
fs.writeFileSync(
  imagePath,
  Buffer.from(imageBase64, "base64")
);

// Thay image cũ bằng URL public
const publicImagePath = `/anhblog/${imageFile}`;

source = source.replace(
  /image:\s*"[^"]*"/,
  `image: "${publicImagePath}"`
);

fs.writeFileSync(blogFile, source, "utf8");

console.log("");
console.log("========================================");
console.log("ĐÃ FIX ẢNH BLOG");
console.log("========================================");
console.log(`Slug:       ${slug}`);
console.log(`Ảnh:        ${imagePath}`);
console.log(`URL public: ${publicImagePath}`);
console.log("========================================");