// scripts/rewrite-product-titles.mjs
//
// Viết lại hàng loạt tiêu đề (field "name") của TOÀN BỘ sản phẩm trong
// src/data/products.ts bằng Gemini API CHÍNH THỨC (key AIzaSy... lấy tại
// https://aistudio.google.com/apikey) — KHÔNG dùng token phiên web hay
// server web2api nào cả.
//
// Yêu cầu khi viết lại: GIỮ tên thương hiệu (Svakom, We-Vibe, Lovense...),
// XÓA mã SKU nếu đang bị nhét trong ngoặc ở cuối tên (vd "(DC89P)"), viết
// chuẩn SEO 2026 (rõ ràng, có từ khóa, không giật tít quá đà).
//
// CÁCH DÙNG
// ---------
// 1) Cần Node 18+ và thư viện @google/genai (đã dùng ở scripts/generate-
//    daily-post.mjs rồi, cài lại nếu máy bạn chưa có):
//      npm install @google/genai --no-save
//
// 2) Tạo file "gemini_api_keys.txt" CÙNG THƯ MỤC VỚI SCRIPT NÀY (tức
//    trong scripts/), mỗi dòng 1 API key thật (AIzaSy...), có thể dùng
//    nhiều key (nhiều tài khoản Google) để chia tải khi hết quota/ngày:
//      AIzaSyABC111...
//      AIzaSyDEF222...
//
// 3) Chạy thử trước với 1 khoảng nhỏ để kiểm tra kết quả trước khi chạy
//    toàn bộ 1895 sản phẩm:
//      node scripts/rewrite-product-titles.mjs --start 1 --end 20
//
//    Xem lại kết quả trong scripts/rewrite-titles-log.csv (cột old/new) —
//    ưng ý thì chạy tiếp phần còn lại:
//      node scripts/rewrite-product-titles.mjs --start 21 --end 1895
//
//    Hoặc chạy hết luôn (mất vài giờ do giới hạn tốc độ gọi API, có nghỉ
//    giữa mỗi lần gọi để tránh bị chặn):
//      node scripts/rewrite-product-titles.mjs --all
//
// AN TOÀN DỮ LIỆU
// ----------------
// Script tự động sao lưu nguyên bản products.ts thành products.ts.bak
// TRƯỚC khi ghi đè lần đầu tiên chạy trong ngày. Nếu kết quả không ưng ý,
// chỉ cần: xóa products.ts, đổi tên products.ts.bak thành products.ts.
//
// Có RESUME: sản phẩm đã xử lý (ghi trong rewrite-titles-log.csv) sẽ tự
// động được bỏ qua nếu chạy lại — an toàn khi bị ngắt giữa chừng.

import { GoogleGenAI } from "@google/genai";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PRODUCTS_PATH = path.join(ROOT, "src/data/products.ts");
const BACKUP_PATH = path.join(ROOT, "src/data/products.ts.bak");
const KEYS_PATH = path.join(ROOT, "scripts/gemini_api_keys.txt");
const LOG_PATH = path.join(ROOT, "scripts/rewrite-titles-log.csv");

const MIN_INTERVAL_MS = 4500; // giãn nhịp gọi API để tránh bị rate-limit (429)

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
  console.error(
    `Khong tim thay API key. Tao file ${KEYS_PATH} (moi dong 1 key AIzaSy...) roi chay lai.`
  );
  process.exit(1);
}

function parseArgs() {
  const args = process.argv.slice(2);
  const all = args.includes("--all");
  const startIdx = args.indexOf("--start");
  const endIdx = args.indexOf("--end");
  const start = startIdx >= 0 ? parseInt(args[startIdx + 1], 10) : 1;
  const end = endIdx >= 0 ? parseInt(args[endIdx + 1], 10) : Infinity;
  return { all, start, end };
}

// Tach file products.ts thanh tung block san pham rieng le de sua dung
// dong "name:" ma khong lam hong cau truc file.
function splitProductBlocks(source) {
  const blocks = [];
  const regex = /  \{\n(?:.*\n)*?  \},\n/g;
  let match;
  while ((match = regex.exec(source)) !== null) {
    blocks.push({ text: match[0], start: match.index, end: regex.lastIndex });
  }
  return { blocks };
}

function extractField(blockText, field) {
  const re = new RegExp(`${field}:\\s*"((?:[^"\\\\]|\\\\.)*)"`);
  const m = blockText.match(re);
  return m ? m[1].replace(/\\"/g, '"') : null;
}

async function generateTitle(ai, { name, category, sku }) {
  const prompt = `
Bạn là chuyên gia SEO thương mại điện tử năm 2026.

Hãy tối ưu tiêu đề sản phẩm dưới đây bằng TIẾNG VIỆT.

Tên sản phẩm hiện tại:
"${name}"

Danh mục:
"${category}"

SKU:
"${sku}"

MỤC TIÊU:
Tạo một tiêu đề tự nhiên, dễ đọc, có khả năng tìm kiếm tốt trên Google và tìm kiếm nội bộ website.

QUY TẮC BẮT BUỘC:

1. GIỮ NGUYÊN thương hiệu nếu thương hiệu đã xuất hiện trong tên gốc.
   Ví dụ: Svakom, We-Vibe, Lovense, Satisfyer...

2. GIỮ LẠI các thông tin thực sự có trong tên gốc:
   - loại sản phẩm
   - tính năng
   - chất liệu
   - kích thước
   - màu sắc
   - dung tích
   - kiểu dáng
   - số lượng
   - đặc điểm sản phẩm

3. KHÔNG ĐƯỢC TỰ SUY ĐOÁN hoặc thêm bất kỳ thông tin nào không xuất hiện trong tên gốc hoặc danh mục.
   Tuyệt đối không tự thêm các từ như:
   "cao cấp", "chính hãng", "tốt nhất", "an toàn", "siêu mạnh",
   "cho nam", "cho nữ", "gốc nước", "chống nước", "nhập khẩu",
   "100% chính hãng" hoặc bất kỳ đặc tính nào khác nếu dữ liệu không xác nhận.

4. XÓA SKU/mã sản phẩm khỏi tiêu đề nếu mã đang nằm trong tên.
   Không tạo SKU mới.

5. ƯU TIÊN đưa từ khóa sản phẩm chính lên đầu tiêu đề.

6. Không nhồi nhét từ khóa.

7. Không dùng clickbait, không phóng đại công dụng.

8. Không dùng emoji hoặc ký tự trang trí.

9. Không lặp lại cùng một cụm từ nhiều lần.

10. Tiêu đề nên khoảng 45-70 ký tự nếu có thể.
    Tuy nhiên, KHÔNG được cắt bỏ thông tin quan trọng chỉ để đạt giới hạn này.

11. Nếu tiêu đề gốc đã rõ ràng và tốt cho SEO, chỉ chỉnh nhẹ thay vì viết lại quá khác.

12. KHÔNG được thay đổi ý nghĩa sản phẩm.

13. Chỉ trả về đúng MỘT dòng tiêu đề.
    Không giải thích.
    Không đặt tiêu đề trong dấu ngoặc kép.

VÍ DỤ:

Tên gốc:
"Gel bôi trơn hương trái cây chai 200ml"

Kết quả phù hợp:
"Gel Bôi Trơn Hương Trái Cây 200ml"

Không được tạo:
"Gel Bôi Trơn Gốc Nước Hương Trái Cây Cao Cấp 200ml"
vì "gốc nước" và "cao cấp" không có trong dữ liệu.

Tên gốc:
"Vòng rung lưỡi liếm điều khiển xa"

Kết quả phù hợp:
"Vòng Rung Lưỡi Liếm Điều Khiển Từ Xa"

Không được tự thêm:
"cao cấp", "cho nữ", "chính hãng" hoặc thông tin khác không có trong dữ liệu.

Bây giờ hãy tối ưu tên sản phẩm đã cung cấp.
`;

  const models = ["gemini-3.6-flash"];

  for (const model of models) {
    try {
      const res = await ai.models.generateContent({
        model,
        contents: prompt,
      });

      const text = res.text
        ?.trim()
        .replace(/^["']|["']$/g, "")
        .replace(/\s+/g, " ");

      if (text && text.length > 5) return text;
    } catch (e) {
      console.warn(`  Model ${model} loi: ${e?.message || e}`);
    }
  }

  return null;
}

async function appendLog(row) {
  const exists = fs.existsSync(LOG_PATH);
  const line =
    [row.sku, row.old, row.new, row.status]
      .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
      .join(",") + "\n";

  // Windows doi khi khoa file CSV trong chop giay (Excel dang mo file nay,
  // hoac neu G:\ la o dia dong bo cloud nhu Google Drive Desktop thi phan
  // mem dong bo cung hay giu khoa file trong luc no dang tai len). Thay vi
  // de loi EBUSY/EPERM lam crash ca script giua chung (mat het tien do cac
  // san pham con lai), thu lai vai lan truoc khi bo cuoc.
  const MAX_RETRIES = 5;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      if (!exists && attempt === 1) {
        fs.writeFileSync(LOG_PATH, "\uFEFFsku,old_title,new_title,status\n", "utf8");
      }
      fs.appendFileSync(LOG_PATH, line, "utf8");
      return;
    } catch (e) {
      const isLocked = e && (e.code === "EBUSY" || e.code === "EPERM" || e.code === "EACCES");
      if (!isLocked || attempt === MAX_RETRIES) {
        console.warn(
          `  [Canh bao] Khong ghi duoc log cho ${row.sku} sau ${attempt} lan thu (${e?.code || e}). ` +
            `Co the file dang mo trong Excel, hoac thu muc dang duoc dong bo cloud (Google Drive/OneDrive) - ` +
            `dong file/tam dung dong bo roi chay lai. Bo qua dong log nay, TIEP TUC chay san pham tiep theo.`
        );
        return; // Khong throw - de main() tiep tuc xu ly cac SKU con lai
      }
      // Cho mot chut roi thu lai (200ms, 400ms, 600ms...)
      await new Promise((r) => setTimeout(r, attempt * 200));
    }
  }
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
  const { all, start, end } = parseArgs();
  const keys = loadApiKeys();
  let keyIndex = 0;
  let ai = new GoogleGenAI({ apiKey: keys[keyIndex] });

  if (!fs.existsSync(BACKUP_PATH)) {
    fs.copyFileSync(PRODUCTS_PATH, BACKUP_PATH);
    console.log(`Da sao luu ban goc vao ${BACKUP_PATH}`);
  }

  let source = fs.readFileSync(PRODUCTS_PATH, "utf8");
  const doneSkus = loadDoneSkus();

  const { blocks } = splitProductBlocks(source);
  console.log(`Tim thay ${blocks.length} san pham trong products.ts`);

  const rangeStart = all ? 1 : start;
  const rangeEnd = all ? blocks.length : Math.min(end, blocks.length);

  let offsetShift = 0; // vi tri co the doi khi thay the text co do dai khac

  for (let i = rangeStart - 1; i < rangeEnd; i++) {
    const block = blocks[i];
    const blockText = block.text;
    const sku = extractField(blockText, "sku");
    const name = extractField(blockText, "name");
    const category = extractField(blockText, "category");

    if (!sku || !name) continue;
    if (doneSkus.has(sku)) {
      console.log(`[${i + 1}/${blocks.length}] ${sku}: da xu ly truoc do, bo qua.`);
      continue;
    }

    console.log(`[${i + 1}/${blocks.length}] Dang xu ly ${sku}: "${name}"`);

    let newTitle = null;
    let attempts = 0;
    while (!newTitle && attempts < keys.length) {
      newTitle = await generateTitle(ai, { name, category, sku });
      if (!newTitle) {
        attempts++;
        if (attempts < keys.length) {
          keyIndex = (keyIndex + 1) % keys.length;
          ai = new GoogleGenAI({ apiKey: keys[keyIndex] });
          console.log(`  Chuyen sang API key #${keyIndex + 1}`);
        }
      }
    }

    if (!newTitle) {
      console.warn(`  Khong tao duoc tieu de moi cho ${sku}, giu nguyen.`);
      await appendLog({ sku, old: name, new: "", status: "FAIL" });
      await new Promise((r) => setTimeout(r, MIN_INTERVAL_MS));
      continue;
    }

    // Thay dong "name:" trong dung block nay, ghi lai vao source day du.
    const escaped = newTitle.replace(/"/g, '\\"');
    const newBlockText = blockText.replace(
      /name:\s*"(?:[^"\\]|\\.)*"/,
      `name: "${escaped}"`
    );
    const realStart = block.start + offsetShift;
    const realEnd = block.end + offsetShift;
    source = source.slice(0, realStart) + newBlockText + source.slice(realEnd);
    offsetShift += newBlockText.length - blockText.length;

    fs.writeFileSync(PRODUCTS_PATH, source, "utf8");
    await appendLog({ sku, old: name, new: newTitle, status: "OK" });
    console.log(`  -> "${newTitle}"`);

    await new Promise((r) => setTimeout(r, MIN_INTERVAL_MS));
  }

  console.log("Hoan tat. Xem chi tiet trong scripts/rewrite-titles-log.csv");
}

main();
