// scripts/seo-new-descriptions.mjs
//
// Viet mo ta chi tiet CHUAN SEO (HTML: H2, danh sach, FAQ, 2 link noi bo) CHI cho
// nhung san pham CHUA CO mo ta chuan, ghi vao field longDescription trong
// src/data/products.ts. San pham da co mo ta HTML chuan (co <h2>) bi BO QUA hoan
// toan - khong goi API, khong ghi de.
//
// "Chua chuan" gom 3 truong hop (dung nhu san pham dang admin gan day):
//   - THIEU : khong co longDescription
//   - CHU   : longDescription la chu thuong (vd "THONG SO KY THUAT: ...")
//   - HTML-KHONG-H2 : la HTML nhung khong co <h2> (anh khong chen duoc vao bai)
//
// Dung Gemini API chinh thuc (@google/genai) + file scripts/gemini_api_keys.txt
// (moi dong 1 key) hoac bien moi truong GEMINI_API_KEYS - giong generate-product-details.mjs.
// KHONG can server localhost:8081.
//
// CACH DUNG (trong G:\vipextoy)
//   node scripts/seo-new-descriptions.mjs --list              # chi LIET KE san pham can viet, khong goi API
//   node scripts/seo-new-descriptions.mjs --dry --limit=2     # viet thu 2 san pham, in ra man hinh, KHONG ghi file
//   node scripts/seo-new-descriptions.mjs --sku=DC82C         # viet that cho 1 hoac nhieu SKU: --sku=DC82C,DC83A
//   node scripts/seo-new-descriptions.mjs --limit=10          # viet that cho 10 san pham dau trong danh sach can viet
//   node scripts/seo-new-descriptions.mjs --all               # viet tat ca san pham can viet (chi dung khi da kiem tra ky)
//
// MAC DINH chi xu ly toi da 10 san pham moi lan chay (khong chay het).
// --sku=... co the dung de viet LAI cho SKU da co mo ta HTML (chi SKU ban chi dinh).
//
// AN TOAN
//   - Ban sao products.ts luu vao thu muc tam cua may truoc khi ghi (duong dan in ra).
//   - Ghi ngay sau MOI san pham (ngat giua chung van giu phan da xong), ghi qua file tam roi doi ten.
//   - Chong bia so lieu: moi so >= 2 chu so trong bai viet phai co trong du lieu goc
//     (ten, mo ta, dac diem, thong so cu...) hoac trong thong tin cua hang; sai -> viet lai,
//     van sai -> BO QUA san pham do va ghi vao log de ban xem tay.
//   - Link noi bo chi cho phep dung 2 URL san pham cung danh muc ma script cung cap
//     (dang https://vipsextoy.com/<slug>); link la khac bi go bo.
//   - Khong cho phep the <img>, <script>, <iframe>: trang san pham tu chen anh sau moi <h2>.

import { GoogleGenAI } from "@google/genai";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PRODUCTS_PATH = path.join(ROOT, "src/data/products.ts");
const KEYS_PATH = path.join(ROOT, "scripts/gemini_api_keys.txt");
const LOG_PATH = path.join(ROOT, "scripts/seo-new-descriptions-log.csv");
const SITE_URL = "https://vipsextoy.com";
const MIN_INTERVAL_MS = 6000; // nghi giua 2 lan goi API de tranh bi gioi han toc do (429)
const MAX_ATTEMPTS = 4;

// Thong tin cua hang duoc phep nhac toi (lay tu chinh trang web) - cung la nguon
// hop le cho viec kiem tra so lieu.
const SHOP_FACTS =
  "Cửa hàng giao hàng nhanh 1–3 ngày, ship COD toàn quốc; đóng gói kín đáo, riêng tư; bảo hành 3 tháng lỗi nhà sản xuất; tư vấn qua hotline trước khi đặt hàng. Chỉ bán cho khách từ 18 tuổi.";

// ---------------- tham so dong lenh ----------------
const args = process.argv.slice(2);
const getArg = (name) => {
  const a = args.find((x) => x.startsWith(`--${name}=`));
  return a ? a.slice(name.length + 3) : null;
};
const LIST_ONLY = args.includes("--list");
const DRY = args.includes("--dry") || args.includes("--dry-run");
const ALL = args.includes("--all");
const SKU_FILTER = (getArg("sku") || "").split(",").map((s) => s.trim().toUpperCase()).filter(Boolean);
const LIMIT = ALL ? Infinity : parseInt(getArg("limit") || "10", 10);
const MODEL = getArg("model") || "gemini-3.6-flash";

// ---------------- doc / phan tich products.ts ----------------
const unescapeStr = (s) => s.replace(/\\(["\\])/g, "$1").replace(/\\n/g, "\n");
const fieldStr = (text, name) => {
  const m = text.match(new RegExp(`^    ${name}: "((?:[^"\\\\]|\\\\.)*)"`, "m"));
  return m ? unescapeStr(m[1]) : "";
};
const fieldFeatures = (text) => {
  const m = text.match(/^    features: \[([\s\S]*?)\],\n/m);
  if (!m) return [];
  return [...m[1].matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((x) => unescapeStr(x[1]));
};
const LD_RE = /^    longDescription: `((?:[^`\\]|\\.)*)`,?/m;
const readLongDescription = (text) => {
  const m = text.match(LD_RE);
  return m ? m[1].replace(/\\([`\\$])/g, "$1") : null;
};

function needsSeo(ld) {
  if (!ld || !ld.trim()) return "THIEU";
  if (!/^\s*</.test(ld)) return "CHU";
  if (!/<h2[\s>]/i.test(ld)) return "HTML-KHONG-H2";
  return null;
}

function parseProducts(content) {
  const startMarker = content.indexOf("export const products");
  if (startMarker < 0) throw new Error("Khong tim thay `export const products` trong products.ts");
  const list = [];
  const re = /\n  \{\n    slug: "([^"]+)"/g;
  re.lastIndex = startMarker;
  let m;
  while ((m = re.exec(content))) {
    const start = m.index;
    const end = content.indexOf("\n  },", start);
    if (end < 0) break;
    const text = content.slice(start, end);
    if (!/^    sku: "/m.test(text)) continue; // khong phai san pham (vd danh muc)
    const ld = readLongDescription(text);
    list.push({
      slug: m[1],
      sku: fieldStr(text, "sku"),
      name: fieldStr(text, "name"),
      category: fieldStr(text, "category"),
      categorySlug: fieldStr(text, "categorySlug"),
      blurb: fieldStr(text, "blurb"),
      description: fieldStr(text, "description"),
      features: fieldFeatures(text),
      oldText: ld || "",
      status: needsSeo(ld),
    });
  }
  return list;
}

// ---------------- khoa API ----------------
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

// ---------------- prompt ----------------
const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const SYSTEM_PROMPT = `Bạn là chuyên gia Content SEO & GEO (Generative Engine Optimization) cho một cửa hàng thương mại điện tử bán sản phẩm chăm sóc cá nhân dành cho người trưởng thành, hợp pháp tại Việt Nam. Nhiệm vụ: viết phần "Chi tiết sản phẩm" dạng HTML, tối ưu cho cả Google truyền thống lẫn các AI trả lời (Google AI Overviews, ChatGPT, Gemini, Perplexity).

QUY TẮC NỘI DUNG
- Giọng văn chuyên nghiệp, tinh tế, như mô tả sản phẩm chăm sóc sức khỏe cá nhân cao cấp: chất liệu, công nghệ, tính năng, cách dùng cơ bản, cách vệ sinh và bảo quản. TUYỆT ĐỐI không viết nội dung khiêu dâm, không tường thuật hành vi tình dục, không dùng ngôn từ phản cảm. Không đưa ra tuyên bố y tế hay chữa bệnh.
- CHỈ dùng thông tin có trong "DỮ LIỆU GỐC" và "THÔNG TIN CỬA HÀNG". KHÔNG bịa thông số, chất liệu, chứng nhận, xuất xứ, thời gian pin, số chế độ rung... nếu dữ liệu gốc không nêu. Thiếu thông tin thì bỏ qua, không đoán.
- TẤT CẢ thông số kỹ thuật có trong dữ liệu gốc (kích thước, chiều dài, trọng lượng, pin, thời gian sạc/dùng, chất liệu, số chế độ...) PHẢI được đưa vào một danh sách <ul><li> với đúng số liệu và đơn vị như bản gốc.
- Không nhắc lại mã SKU/mã sản phẩm. Nhắc tên thương hiệu và tên công nghệ đúng, nhất quán.
- Mỗi sản phẩm phải có nội dung thật sự khác biệt, không dùng khung câu sáo rỗng lặp lại giữa các sản phẩm.

CHUẨN SEO ON-PAGE
- Dùng thẻ <h2>/<h3> hợp lý, đoạn văn ngắn 2-4 câu, danh sách ưu điểm/thông số, chèn từ khóa liên quan đến tên và danh mục sản phẩm một cách tự nhiên, không nhồi nhét.
- Có ÍT NHẤT 4 thẻ <h2> (website tự chèn ảnh sản phẩm ngay sau mỗi <h2>), theo bố cục được chỉ định.

CHUẨN AEO/GEO
- Mở bài bằng một đoạn "trả lời trực tiếp" 1-2 câu, đứng độc lập được, nói rõ sản phẩm là gì và dùng để làm gì.
- Cuối bài có khối "Câu hỏi thường gặp" gồm đúng 3 câu hỏi, mỗi câu hỏi dùng thẻ <h3> và câu trả lời 2-3 câu bằng thẻ <p>. Câu hỏi là loại người dùng thật sự hay hỏi (phù hợp người mới không, vệ sinh thế nào, sạc/dùng bao lâu nếu dữ liệu có).
- Ưu tiên sự thật cụ thể hơn câu marketing mơ hồ.

INTERNAL LINK
- Nếu có danh sách "SẢN PHẨM LIÊN QUAN", chèn ĐÚNG số lượng link được cung cấp bằng thẻ <a href="URL"> vào vị trí tự nhiên trong bài, không dồn cả hai vào một câu. Anchor text mỗi link phải khác nhau, mô tả tự nhiên (không lặp nguyên tên sản phẩm kiểu nhồi từ khóa).
- href chỉ được chứa đúng 1 URL thuần như được cung cấp. Không dùng cú pháp markdown. Không tự bịa URL.

ĐỊNH DẠNG XUẤT
- Chỉ trả về THUẦN HTML (<h2>, <h3>, <p>, <ul>, <li>, <a>, <strong>). Không markdown, không \`\`\`html, không lời giải thích, không lời dẫn.
- TUYỆT ĐỐI KHÔNG chèn thẻ <img>, <script>, <iframe>, <style>.`;

const STRUCTURES = [
  "Đoạn trả lời trực tiếp -> H2 'Tính năng nổi bật' (ul) -> H2 'Chất liệu và công nghệ' (đoạn văn) -> H2 'Thông số kỹ thuật' (ul) -> H2 'Hướng dẫn sử dụng và vệ sinh' (ul) -> H2 'Câu hỏi thường gặp' (3 cặp H3 + p).",
  "Đoạn trả lời trực tiếp -> H2 'Vì sao nên chọn sản phẩm này' (đoạn văn) -> H2 'Thông số và chất liệu' (ul) -> H2 'Cách dùng hiệu quả' (đoạn văn) -> H2 'Bảo quản và vệ sinh' (ul) -> H2 'Câu hỏi thường gặp' (3 cặp H3 + p).",
  "Đoạn trả lời trực tiếp -> H2 'Điểm nổi bật' (ul 4-5 ý) -> H2 'Trải nghiệm sử dụng' (đoạn văn) -> H2 'Thông số kỹ thuật' (ul) -> H2 'Bảo quản và vệ sinh' (ul) -> H2 'Câu hỏi thường gặp' (3 cặp H3 + p).",
  "Đoạn trả lời trực tiếp -> H2 'Thiết kế và chất liệu' (đoạn văn) -> H2 'Công dụng thực tế' (ul) -> H2 'Thông số kỹ thuật' (ul) -> H2 'Ai nên dùng sản phẩm này' (đoạn văn) -> H2 'Câu hỏi thường gặp' (3 cặp H3 + p).",
];
const TONES = [
  "chuyên nghiệp, điềm đạm, như tư vấn viên chăm sóc sức khỏe cá nhân",
  "gần gũi, thân thiện, như đang tư vấn trực tiếp cho khách mới",
  "thiên về dữ liệu kỹ thuật, ít cảm thán, đi thẳng vào sự thật",
  "tự tin, súc tích, câu ngắn, nêu rõ lợi ích cho người dùng",
];
const FOCUSES = [
  "nhấn mạnh sự an toàn của chất liệu",
  "nhấn mạnh sự tiện lợi, dễ dùng cho người mới",
  "nhấn mạnh độ bền, vệ sinh và bảo quản",
  "nhấn mạnh thiết kế và công nghệ đặc trưng",
];

function buildUserPrompt(p, related, feedback) {
  const relatedBlock = related.length
    ? `SẢN PHẨM LIÊN QUAN (chèn đúng ${related.length} link):\n` +
      related.map((r) => `- ${r.name}: ${SITE_URL}/${r.slug}`).join("\n")
    : "SẢN PHẨM LIÊN QUAN: (không có — không chèn link nào)";
  return `DỮ LIỆU GỐC
- Tên sản phẩm: ${p.name}
- Danh mục: ${p.category}
- Mô tả ngắn: ${p.blurb || "(không có)"}
- Mô tả: ${p.description || "(không có)"}
- Đặc điểm: ${p.features.length ? p.features.join("; ") : "(không có)"}
- Nội dung chi tiết hiện có (thông số / mô tả nhà sản xuất, có thể là chữ thường):
---
${p.oldText.trim() || "(chưa có)"}
---

THÔNG TIN CỬA HÀNG (được phép nhắc tới): ${SHOP_FACTS}

${relatedBlock}

YÊU CẦU CHO LẦN VIẾT NÀY
- Bố cục: ${pickRandom(STRUCTURES)}
- Giọng văn: ${pickRandom(TONES)}
- Góc nhấn mạnh: ${pickRandom(FOCUSES)}
${feedback ? `\nLƯU Ý SỬA LỖI TỪ LẦN TRƯỚC: ${feedback}\n` : ""}
Hãy viết phần "Chi tiết sản phẩm" hoàn chỉnh theo đúng quy tắc.`;
}

// ---------------- kiem tra + lam sach ket qua ----------------
const numTokens = (text) =>
  (text.match(/\d[\d.,]*\d|\d/g) || []).map((t) => t.replace(/[.,]/g, "")).filter((t) => t.length >= 2);

function cleanAndValidate(raw, p, related) {
  let html = raw.trim().replace(/^```(?:html)?\s*/i, "").replace(/```\s*$/i, "").trim();
  html = html.replace(/href="\[([^\]]*)\]\(([^)]+)\)"/g, 'href="$2"');
  if (!html.startsWith("<")) return { error: "khong phai HTML (khong bat dau bang the)" };
  if (/<\s*(img|script|iframe|style)\b/i.test(html) || /immersive_entry_chip|googleusercontent/i.test(html)) {
    return { error: "co the cam (img/script/iframe/style) hoac placeholder Canvas" };
  }

  // Go link la: chi giu href nam trong danh sach cho phep.
  const allowed = new Set(related.map((r) => `${SITE_URL}/${r.slug}`));
  html = html.replace(/<a\b[^>]*\bhref="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (whole, href, inner) =>
    allowed.has(href.replace(/\/$/, "")) ? `<a href="${href.replace(/\/$/, "")}">${inner}</a>` : inner
  );

  const h2 = (html.match(/<h2[\s>]/gi) || []).length;
  const h3 = (html.match(/<h3[\s>]/gi) || []).length;
  if (h2 < 3) return { error: `chi co ${h2} the <h2> (can >= 4)` };
  if (h3 < 3) return { error: `chi co ${h3} the <h3> cho FAQ (can 3)` };
  const textOnly = html.replace(/<[^>]+>/g, " ");
  if (textOnly.length < 900) return { error: "bai qua ngan (< 900 ky tu)" };
  if (html.length > 20000) return { error: "bai qua dai" };

  // Chong bia so lieu.
  const corpus = [p.name, p.category, p.blurb, p.description, p.features.join(" "), p.oldText, SHOP_FACTS].join(" ");
  const known = new Set(numTokens(corpus));
  const unknown = [...new Set(numTokens(textOnly))].filter((t) => !known.has(t));
  if (unknown.length) return { error: `co so khong co trong du lieu goc: ${unknown.slice(0, 8).join(", ")}`, feedback: `Các số sau KHÔNG có trong dữ liệu gốc nên phải bỏ hoặc sửa lại đúng theo dữ liệu gốc: ${unknown.slice(0, 8).join(", ")}.` };

  return { html };
}

// ---------------- ghi vao products.ts ----------------
function setLongDescription(content, slug, html) {
  const start = content.indexOf(`\n  {\n    slug: "${slug}"`);
  if (start < 0) throw new Error(`Khong tim thay san pham ${slug} de ghi`);
  const end = content.indexOf("\n  },", start);
  const block = content.slice(start, end);
  const safe = html.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");
  const literal = `    longDescription: \`${safe}\`,`;
  const newBlock = LD_RE.test(block) ? block.replace(LD_RE, () => literal) : `${block}\n${literal}`;
  return content.slice(0, start) + newBlock + content.slice(end);
}

function writeAtomic(file, text) {
  const tmp = file + ".tmp";
  fs.writeFileSync(tmp, text, "utf8");
  fs.renameSync(tmp, file);
}

function appendLog(row) {
  if (!fs.existsSync(LOG_PATH)) fs.writeFileSync(LOG_PATH, "time,sku,slug,status,note\n", "utf8");
  const esc = (v) => `"${String(v).replace(/"/g, '""')}"`;
  fs.appendFileSync(LOG_PATH, row.map(esc).join(",") + "\n", "utf8");
}

// ---------------- chay chinh ----------------
async function main() {
  let content = fs.readFileSync(PRODUCTS_PATH, "utf8");
  const all = parseProducts(content);

  const counts = { THIEU: 0, CHU: 0, "HTML-KHONG-H2": 0 };
  all.forEach((p) => p.status && counts[p.status]++);
  const totalNeed = counts.THIEU + counts.CHU + counts["HTML-KHONG-H2"];
  console.log(`Tong ${all.length} san pham. Da co mo ta chuan: ${all.length - totalNeed}.`);
  console.log(`CAN VIET: ${totalNeed}  (thieu: ${counts.THIEU} | chu thuong: ${counts.CHU} | HTML khong co <h2>: ${counts["HTML-KHONG-H2"]})\n`);

  let queue;
  if (SKU_FILTER.length) {
    queue = all.filter((p) => SKU_FILTER.includes(p.sku.toUpperCase()));
    const missing = SKU_FILTER.filter((s) => !queue.some((p) => p.sku.toUpperCase() === s));
    if (missing.length) console.log(`Khong thay SKU: ${missing.join(", ")} (kiem tra lai ma, hoac san pham chua duoc luu len products.ts - chay git pull)`);
  } else {
    queue = all.filter((p) => p.status);
  }
  const todo = queue.slice(0, LIMIT);

  console.log(`Se xu ly ${todo.length} san pham${queue.length > todo.length ? ` (con ${queue.length - todo.length} san pham nua - chay tiep lan sau, hoac dung --limit / --all)` : ""}:`);
  todo.forEach((p) => console.log(`  - ${p.sku}  [${p.status || "viet lai"}]  ${p.name.slice(0, 80)}`));
  console.log();

  if (LIST_ONLY || !todo.length) return;

  const keys = loadApiKeys();
  let keyIndex = 0;
  const clients = new Map();
  const client = () => {
    if (!clients.has(keyIndex)) clients.set(keyIndex, new GoogleGenAI({ apiKey: keys[keyIndex] }));
    return clients.get(keyIndex);
  };

  if (!DRY) {
    const backup = path.join(os.tmpdir(), `products.ts.backup-seo-${Date.now()}`);
    fs.copyFileSync(PRODUCTS_PATH, backup);
    console.log(`Da sao luu products.ts truoc khi ghi: ${backup}\n`);
  }

  let ok = 0;
  let skipped = 0;
  let last = 0;

  for (let i = 0; i < todo.length; i++) {
    const p = todo[i];
    console.log(`[${i + 1}/${todo.length}] ${p.sku} - ${p.name.slice(0, 70)}`);

    const related = all
      .filter((x) => x.categorySlug === p.categorySlug && x.slug !== p.slug)
      .sort(() => Math.random() - 0.5)
      .slice(0, 2);

    let result = null;
    let lastError = "";
    let feedback = "";

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const wait = MIN_INTERVAL_MS - (Date.now() - last);
      if (wait > 0) await sleep(wait);
      last = Date.now();
      try {
        const res = await client().models.generateContent({
          model: MODEL,
          contents: buildUserPrompt(p, related, feedback),
          config: { systemInstruction: SYSTEM_PROMPT, temperature: 0.8 },
        });
        const check = cleanAndValidate(res.text || "", p, related);
        if (check.html) {
          result = check.html;
          break;
        }
        lastError = check.error;
        feedback = check.feedback || `Lỗi lần trước: ${check.error}. Hãy sửa lại.`;
        console.log(`  Lan ${attempt}: bai chua dat (${check.error}) - viet lai...`);
      } catch (e) {
        lastError = String(e?.message || e).slice(0, 200);
        console.log(`  Lan ${attempt}: loi API (${lastError.slice(0, 120)})`);
        if (keys.length > 1) {
          keyIndex = (keyIndex + 1) % keys.length;
          console.log(`  Chuyen sang API key #${keyIndex + 1}`);
        }
        await sleep(8000);
      }
    }

    const stamp = new Date().toISOString();
    if (!result) {
      skipped++;
      console.log(`  BO QUA (giu nguyen mo ta cu): ${lastError}\n`);
      appendLog([stamp, p.sku, p.slug, "SKIP-CAN-XEM-TAY", lastError]);
      continue;
    }

    const links = (result.match(/<a\b/gi) || []).length;
    const h2 = (result.match(/<h2[\s>]/gi) || []).length;
    if (DRY) {
      console.log(`  (dry) ${h2} the h2, ${links} link noi bo, ${result.length} ky tu. Xem truoc:`);
      console.log("  " + result.replace(/\s+/g, " ").slice(0, 600) + "...\n");
    } else {
      content = setLongDescription(content, p.slug, result);
      writeAtomic(PRODUCTS_PATH, content);
      appendLog([stamp, p.sku, p.slug, "OK", `${h2} h2, ${links} link, ${result.length} chars`]);
      console.log(`  Da ghi (${h2} the h2, ${links} link noi bo).\n`);
    }
    ok++;
  }

  console.log(`Xong: ${ok} san pham${DRY ? " (dry-run, chua ghi gi)" : " da ghi"}, ${skipped} bo qua can xem tay (xem ${path.relative(ROOT, LOG_PATH)}).`);
  if (!DRY && ok) console.log("Buoc tiep theo: npm run dev -> mo trang san pham kiem tra, roi git add -A / commit / push.");
}

main().catch((e) => {
  console.error("Loi:", e);
  process.exit(1);
});
