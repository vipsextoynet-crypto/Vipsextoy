// scripts/generate-product-details.mjs
//
// Dung Gemini API (cung 1 co che voi scripts/rewrite-product-titles.mjs)
// de VIET MOI phan "mo ta chi tiet" chuan SEO cho tung san pham, ghi vao
// field "longDescription" trong src/data/products.ts. Noi dung nay se
// hien o khoi "Chi tiet san pham" tren trang chi tiet san pham.
//
// CACH DUNG
// ---------
// 1) Da co san "scripts/gemini_api_keys.txt" tu truoc (dung chung voi
//    script rewrite-product-titles.mjs) - khong can tao lai.
//
// 2) Chay thu mot khoang nho truoc:
//      node scripts/generate-product-details.mjs --start 1 --end 20
//
//    Xem lai ket qua that trong products.ts (tim field longDescription
//    cua vai SKU dau) va trong scripts/generate-details-log.csv - ung y
//    thi chay tiep phan con lai:
//      node scripts/generate-product-details.mjs --start 21 --end 1898
//
//    Hoac chay het (mat vai gio do gian nhip goi API):
//      node scripts/generate-product-details.mjs --all
//
// AN TOAN DU LIEU
// ----------------
// Tu dong sao luu products.ts thanh products.ts.bak-details TRUOC KHI ghi
// de lan dau tien chay. Co RESUME qua file log CSV - SKU da xong (OK) se
// tu dong bo qua neu chay lai, an toan khi bi ngat giua chung.

import { GoogleGenAI } from "@google/genai";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PRODUCTS_PATH = path.join(ROOT, "src/data/products.ts");
const BACKUP_PATH = path.join(ROOT, "src/data/products.ts.bak-details");
const KEYS_PATH = path.join(ROOT, "scripts/gemini_api_keys.txt");
const LOG_PATH = path.join(ROOT, "scripts/generate-details-log.csv");

const MIN_INTERVAL_MS = 4500; // giong script rewrite title, tranh bi rate-limit (429)

function loadApiKeys() {
  const env = (process.env.GEMINI_API_KEYS || "").trim();
  if (env) return env.split(",").map((k) => k.trim()).filter(Boolean);
  if (fs.existsSync(KEYS_PATH)) {
    return fs
      .readFileSync(KEYS_PATH, "utf8")
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("#"));
  }
  console.error(`Khong tim thay API key. Tao file ${KEYS_PATH} (moi dong 1 key AIzaSy...) roi chay lai.`);
  process.exit(1);
}

function parseArgs() {
  const args = process.argv.slice(2);
  const all = args.includes("--all");
  const force = args.includes("--force"); // viet lai ca SKU da co longDescription
  const startIdx = args.indexOf("--start");
  const endIdx = args.indexOf("--end");
  const start = startIdx >= 0 ? parseInt(args[startIdx + 1], 10) : 1;
  const end = endIdx >= 0 ? parseInt(args[endIdx + 1], 10) : Infinity;
  return { all, start, end, force };
}

function splitProductBlocks(source) {
  const blocks = [];
  const regex = /  \{\n(?:.*\n)*?  \},\n/g;
  let match;
  while ((match = regex.exec(source)) !== null) {
    blocks.push({ text: match[0], start: match.index, end: regex.lastIndex });
  }
  return blocks;
}

function extractField(blockText, field) {
  const re = new RegExp(`${field}:\\s*"((?:[^"\\\\]|\\\\.)*)"`);
  const m = blockText.match(re);
  return m ? m[1].replace(/\\"/g, '"') : null;
}

function extractStringArrayField(blockText, field) {
  const re = new RegExp(`${field}:\\s*\\[([^\\]]*)\\]`);
  const m = blockText.match(re);
  if (!m) return [];
  return [...m[1].matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((x) => x[1].replace(/\\"/g, '"'));
}

function hasLongDescription(blockText) {
  return /longDescription:\s*`/.test(blockText);
}

async function generateDetail(ai, { name, category, blurb, description, features, sku }) {
  const prompt = `
Bạn là chuyên gia viết nội dung SEO thương mại điện tử năm 2026, viết bằng TIẾNG VIỆT.

Viết phần "Mô tả chi tiết" cho sản phẩm dưới đây, hiển thị ở khối "Chi tiết sản phẩm" trên trang.

DỮ LIỆU CÓ SẴN (chỉ được dùng đúng thông tin này, không suy đoán thêm):
- Tên sản phẩm: "${name}"
- Danh mục: "${category}"
- Mô tả ngắn hiện có: "${blurb}"
- Mô tả hiện có: "${description}"
- Đặc điểm nổi bật: ${features.length ? features.map((f) => `"${f}"`).join(", ") : "(không có)"}
- Mã sản phẩm: "${sku}"

MỤC TIÊU: Viết 2-3 đoạn văn (mỗi đoạn 2-4 câu), tự nhiên, mạch lạc, chuẩn SEO, mở rộng từ dữ liệu có sẵn (không lặp y nguyên câu chữ của mô tả ngắn), giúp khách hàng hiểu rõ hơn về sản phẩm trước khi mua.

QUY TẮC BẮT BUỘC:
1. KHÔNG bịa thêm thông số kỹ thuật, chất liệu, kích thước, dung tích pin, chứng nhận, xuất xứ... nếu không có trong dữ liệu trên. Nếu muốn nhắc tới các mục này mà không chắc chắn, hãy viết chung chung (ví dụ "thiết kế nhỏ gọn, tiện mang theo") thay vì đưa ra số liệu cụ thể tự nghĩ ra.
2. Văn phong THƯƠNG MẠI, LỊCH SỰ, TINH TẾ - giống một cửa hàng bán đồ chăm sóc sức khỏe/wellness cá nhân uy tín. TUYỆT ĐỐI KHÔNG dùng ngôn ngữ khiêu dâm, mô tả hành vi tình dục cụ thể, hay chi tiết gợi dục lộ liễu.
3. KHÔNG đưa ra tuyên bố về công dụng y tế/chữa bệnh chưa được kiểm chứng.
4. KHÔNG dùng emoji, KHÔNG viết hoa toàn bộ, KHÔNG chèn tiêu đề/markdown (không dùng dấu *, #, gạch đầu dòng...).
5. KHÔNG nhắc lại nguyên văn mã SKU trong bài viết.
6. Chỉ trả về đúng phần nội dung (2-3 đoạn văn, các đoạn cách nhau bằng 1 dòng trống). Không giải thích, không lời dẫn, không đặt trong dấu ngoặc kép.

Bây giờ hãy viết mô tả chi tiết cho sản phẩm trên.
`;

  const models = ["gemini-3.6-flash"];

  for (const model of models) {
    try {
      const res = await ai.models.generateContent({ model, contents: prompt });
      const text = res.text?.trim().replace(/^[`"']+|[`"']+$/g, "");
      if (text && text.length > 40) return text;
    } catch (e) {
      console.warn(`  Model ${model} loi: ${e?.message || e}`);
    }
  }
  return null;
}

function setLongDescriptionField(blockText, content) {
  // Dung template literal (backtick) de giu nguyen xuong dong giua cac
  // doan van - escape dung 3 ky tu co the pha vo cu phap: \, ` va ${
  const escaped = content
    .replace(/\\/g, "\\\\")
    .replace(/`/g, "\\`")
    .replace(/\$\{/g, "\\${");
  const literal = `longDescription: \`${escaped}\``;

  if (/longDescription:\s*`(?:[^`\\]|\\.)*`/.test(blockText)) {
    return blockText.replace(/longDescription:\s*`(?:[^`\\]|\\.)*`/, literal);
  }
  // Chua co field -> chen truoc dau "},\n" cuoi block
  return blockText.replace(/\n(  \},\n)$/, `\n    ${literal},\n$1`);
}

function appendLog(row) {
  const exists = fs.existsSync(LOG_PATH);
  const line =
    [row.sku, row.name, row.status]
      .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
      .join(",") + "\n";
  if (!exists) {
    fs.writeFileSync(LOG_PATH, "\uFEFFsku,name,status\n", "utf8");
  }
  fs.appendFileSync(LOG_PATH, line, "utf8");
}

function loadDoneSkus() {
  if (!fs.existsSync(LOG_PATH)) return new Set();
  const lines = fs.readFileSync(LOG_PATH, "utf8").split("\n").slice(1);
  const done = new Set();
  for (const line of lines) {
    const m = line.match(/^"([^"]*)"/);
    if (m && line.includes(",OK")) done.add(m[1]);
  }
  return done;
}

async function main() {
  const { all, start, end, force } = parseArgs();
  const keys = loadApiKeys();
  let keyIndex = 0;
  let ai = new GoogleGenAI({ apiKey: keys[keyIndex] });

  if (!fs.existsSync(BACKUP_PATH)) {
    fs.copyFileSync(PRODUCTS_PATH, BACKUP_PATH);
    console.log(`Da sao luu ban goc vao ${BACKUP_PATH}`);
  }

  let source = fs.readFileSync(PRODUCTS_PATH, "utf8");
  const doneSkus = loadDoneSkus();

  const blocks = splitProductBlocks(source);
  console.log(`Tim thay ${blocks.length} san pham trong products.ts`);

  const rangeStart = all ? 1 : start;
  const rangeEnd = all ? blocks.length : Math.min(end, blocks.length);

  let offsetShift = 0;

  for (let i = rangeStart - 1; i < rangeEnd; i++) {
    const block = blocks[i];
    const blockText = block.text;
    const sku = extractField(blockText, "sku");
    const name = extractField(blockText, "name");
    if (!sku || !name) continue;

    if (!force && hasLongDescription(blockText)) {
      console.log(`[${i + 1}/${blocks.length}] ${sku}: da co longDescription, bo qua (dung --force de viet lai).`);
      continue;
    }
    if (doneSkus.has(sku)) {
      console.log(`[${i + 1}/${blocks.length}] ${sku}: da xu ly truoc do, bo qua.`);
      continue;
    }

    const category = extractField(blockText, "category") || "";
    const blurb = extractField(blockText, "blurb") || "";
    const description = extractField(blockText, "description") || "";
    const features = extractStringArrayField(blockText, "features");

    console.log(`[${i + 1}/${blocks.length}] Dang xu ly ${sku}: "${name}"`);

    let content = null;
    let attempts = 0;
    while (!content && attempts < keys.length) {
      content = await generateDetail(ai, { name, category, blurb, description, features, sku });
      if (!content) {
        attempts++;
        if (attempts < keys.length) {
          keyIndex = (keyIndex + 1) % keys.length;
          ai = new GoogleGenAI({ apiKey: keys[keyIndex] });
          console.log(`  Chuyen sang API key #${keyIndex + 1}`);
        }
      }
    }

    if (!content) {
      console.warn(`  Khong tao duoc mo ta chi tiet cho ${sku}, bo qua.`);
      appendLog({ sku, name, status: "FAIL" });
      await new Promise((r) => setTimeout(r, MIN_INTERVAL_MS));
      continue;
    }

    const newBlockText = setLongDescriptionField(blockText, content);
    const realStart = block.start + offsetShift;
    const realEnd = block.end + offsetShift;
    source = source.slice(0, realStart) + newBlockText + source.slice(realEnd);
    offsetShift += newBlockText.length - blockText.length;

    fs.writeFileSync(PRODUCTS_PATH, source, "utf8");
    appendLog({ sku, name, status: "OK" });
    console.log(`  -> da viet ${content.length} ky tu.`);

    await new Promise((r) => setTimeout(r, MIN_INTERVAL_MS));
  }

  console.log("Hoan tat. Xem chi tiet trong scripts/generate-details-log.csv");
}

main();