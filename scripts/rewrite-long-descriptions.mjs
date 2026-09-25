// scripts/rewrite-long-descriptions.mjs
//
// Doc src/data/products.ts, voi moi SAN PHAM (khong dung cham category)
// goi server Gemini-FastAPI local de viet lai longDescription thanh HTML
// chuan SEO/AEO/GEO, xoay ngau nhien bo cuc/giong van/goc nhan/kieu mo dau
// de tranh "scaled content", va cheo 2 link noi bo toi san pham cung
// danh muc khi co.
//
// CHAY THU TRUOC VOI --dry --limit=3 DE KIEM TRA KET QUA, DUNG SUA THANG VAO
// FILE THAT KHI CHUA XEM KET QUA.
//
// Cach chay:
//   node scripts/rewrite-long-descriptions.mjs --dry --limit=3
//   node scripts/rewrite-long-descriptions.mjs --limit=50
//   node scripts/rewrite-long-descriptions.mjs        (chay het, sau khi da test on)

import fs from "node:fs/promises";
import path from "node:path";

const FILE_PATH = path.resolve("src/data/products.ts");
const LOCAL_API_URLS = [
  "http://localhost:8081/v1/chat/completions", // tai khoan 1 (hoac an danh)
  "http://localhost:8082/v1/chat/completions", // tai khoan 2 (them dong neu co)
];
const LOCAL_API_KEY = ""; // de trong neu "api_keys" trong config.json cua ban cung de trong []
const MODEL = "gemini-3.5-flash-thinking"; // output dai hon (~20k ky tu), hop voi mo ta san pham dai
const SITE_URL = "https://vipsextoy.com"; // doi dung domain that cua ban
const DELAY_MS = 9000; // tang delay - che do an danh de bi Google rate-limit (429) neu goi qua nhanh trong thoi gian dai

let endpointIndex = 0;
function nextEndpoint() {
  const url = LOCAL_API_URLS[endpointIndex % LOCAL_API_URLS.length];
  endpointIndex++;
  return url;
}

const args = process.argv.slice(2);
const isDry = args.includes("--dry");
const force = args.includes("--force"); // reprocess ngay ca san pham da la HTML
const limitArg = args.find((a) => a.startsWith("--limit="));
const limit = limitArg ? parseInt(limitArg.split("=")[1], 10) : Infinity;

function isAlreadyHtml(text) {
  return /^\s*</.test(text);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ============ PROMPT GUI GEMINI — chuan SEO + AEO/GEO 2026 ============

const SYSTEM_PROMPT = `Bạn là chuyên gia Content SEO & GEO (Generative Engine Optimization) cho
một shop thương mại điện tử bán đồ chơi người lớn (sextoy) hợp pháp tại
Việt Nam. Nhiệm vụ: viết lại mô tả chi tiết sản phẩm (HTML) để tối ưu cho
CẢ Google truyền thống LẪN các AI trả lời (Google AI Overviews, ChatGPT,
Gemini, Perplexity...).

QUY TẮC NỘI DUNG:
- Giọng văn chuyên nghiệp, tinh tế, tập trung vào: chất liệu, công nghệ,
  tính năng, công dụng, cách dùng cơ bản, cách vệ sinh/bảo quản, cam kết
  bảo hành/bảo mật đơn hàng. TUYỆT ĐỐI không viết nội dung khiêu dâm,
  tường thuật tình dục lộ liễu hay ngôn từ phản cảm — giữ văn phong như
  mô tả sản phẩm chăm sóc sức khoẻ cá nhân cao cấp.
- CHỈ dùng thông tin/số liệu đã có trong mô tả gốc (kích thước, chế độ
  rung, chất liệu, công nghệ...). TUYỆT ĐỐI KHÔNG bịa ra thông số, chứng
  nhận, hay tính năng không có trong bản gốc.
- Mỗi sản phẩm phải có nội dung THỰC SỰ KHÁC BIỆT, không dùng khung câu
  sáo rỗng lặp lại y hệt giữa các sản phẩm (tránh bị Google coi là
  "scaled content" / nội dung nhân bản hàng loạt).

CHUẨN SEO ON-PAGE:
- Có thẻ H2/H3 hợp lý, đoạn văn ngắn 2-4 câu, bullet list liệt kê tính
  năng/ưu điểm, chèn từ khoá liên quan đến tên + danh mục sản phẩm một
  cách tự nhiên (không nhồi nhét từ khoá).
- BẮT BUỘC theo đúng bố cục được chỉ định trong phần "Yêu cầu bố cục" bên
  dưới (bố cục sẽ khác nhau giữa các lần gọi để tránh trùng khung mẫu).

CHUẨN AEO/GEO (tối ưu cho AI trả lời):
- BẮT BUỘC có một đoạn "trả lời trực tiếp" 1-2 câu ngay đầu bài, đứng
  độc lập được, trả lời thẳng câu hỏi "Sản phẩm này là gì / dùng để làm
  gì" — vì đây là dạng đoạn AI hay trích dẫn nhất.
- BẮT BUỘC có khối FAQ gồm 3 câu hỏi thường gặp + câu trả lời ngắn gọn
  (2-3 câu/câu trả lời), dùng thẻ <h3> cho câu hỏi. Câu hỏi nên là dạng
  người dùng thật sự hay hỏi AI (vd "Sản phẩm này có phù hợp với người
  mới không?", "Vệ sinh như thế nào?", "Có ồn không?"...).
- Ưu tiên số liệu, sự thật cụ thể, nhất quán hơn là câu marketing mơ hồ.
- Nhắc tên thương hiệu/công nghệ chính xác, nhất quán (không viết tắt
  hay đổi tên khác đi giữa các đoạn).

INTERNAL LINK:
- Nếu được cung cấp danh sách sản phẩm liên quan (kèm URL), hãy chèn ĐÚNG
  số lượng link được cung cấp (thường là 2) dưới dạng thẻ <a href="...">
  vào các vị trí TỰ NHIÊN, phù hợp ngữ cảnh trong bài — KHÔNG dồn cả 2
  link vào cùng một câu cuối bài kiểu danh sách liệt kê.
- Anchor text (chữ hiển thị link) của mỗi link PHẢI khác nhau, viết tự
  nhiên theo tên sản phẩm liên quan đó (VD "dòng sản phẩm mini cùng
  thương hiệu", không lặp lại nguyên văn tên sản phẩm y hệt kiểu nhồi
  từ khoá).
- Nếu không có sản phẩm liên quan nào được cung cấp, bỏ qua phần này,
  KHÔNG tự bịa link hay URL.

ĐỊNH DẠNG XUẤT:
- Trả về THUẦN HTML (dùng <h2>, <h3>, <p>, <ul><li>, <a>), không kèm
  markdown, không kèm giải thích, không kèm \`\`\`html.
- TUYỆT ĐỐI KHÔNG tự chèn thẻ <img> vào nội dung, kể cả khi bản mô tả gốc
  có ảnh. Hệ thống sẽ tự động chèn đúng ảnh sản phẩm (kèm alt text) vào
  vị trí phù hợp sau khi bạn viết xong — bạn chỉ cần lo phần chữ.
- TRẢ LỜI TRỰC TIẾP TRONG TIN NHẮN CHAT THÔNG THƯỜNG. KHÔNG tạo tài liệu
  riêng, KHÔNG dùng chế độ Canvas/Immersive/Doc, KHÔNG chèn link dạng
  "immersive_entry_chip" hay bất kỳ placeholder nào thay cho nội dung —
  toàn bộ HTML phải nằm ngay trong câu trả lời văn bản của bạn.
- Thuộc tính href của thẻ <a> CHỈ được chứa đúng 1 URL thuần (vd
  href="https://vipsextoy.com/product/abc"). TUYỆT ĐỐI KHÔNG viết theo
  cú pháp markdown [text](url) hay lồng ngoặc vuông/ngoặc đơn bên trong
  href — đây là lỗi HTML sai, không được phép xảy ra.`;

const STRUCTURE_VARIANTS = [
  "Đoạn trả lời trực tiếp mở đầu -> H2 'Tính năng nổi bật' (bullet) -> " +
    "H2 'Chất liệu & công nghệ' (đoạn văn) -> H2 'Hướng dẫn sử dụng & vệ sinh' " +
    "(bullet) -> H2 'Câu hỏi thường gặp' (3 cặp H3/đoạn văn).",

  "Đoạn trả lời trực tiếp mở đầu -> H2 'Vì sao nên chọn [tên sản phẩm]' " +
    "(đoạn văn ngắn) -> H2 'Thông số & chất liệu' (bullet) -> H2 'Cách dùng " +
    "hiệu quả' (đoạn văn) -> H2 'Câu hỏi thường gặp' (3 cặp H3/đoạn văn).",

  "Đoạn trả lời trực tiếp mở đầu -> H2 'Điểm nổi bật' (bullet ngắn 4-5 ý) " +
    "-> H2 'Trải nghiệm sử dụng' (đoạn văn) -> H2 'Bảo quản & vệ sinh' " +
    "(bullet) -> H2 'Câu hỏi thường gặp' (3 cặp H3/đoạn văn).",

  "Đoạn trả lời trực tiếp mở đầu -> H2 'Thiết kế & chất liệu' (đoạn văn) " +
    "-> H2 'Công dụng thực tế' (bullet) -> H2 'Ai nên dùng sản phẩm này' " +
    "(đoạn văn ngắn) -> H2 'Câu hỏi thường gặp' (3 cặp H3/đoạn văn).",

  "Đoạn trả lời trực tiếp mở đầu -> H2 'Thông số kỹ thuật' (bullet) -> " +
    "H2 'Trải nghiệm khác biệt' (đoạn văn) -> H2 'Mẹo dùng & bảo quản' " +
    "(bullet ngắn) -> H2 'Câu hỏi thường gặp' (3 cặp H3/đoạn văn).",

  "Đoạn trả lời trực tiếp mở đầu -> H2 'Ưu điểm chính' (bullet) -> H2 " +
    "'Cảm nhận khi sử dụng' (đoạn văn) -> H2 'Hướng dẫn vệ sinh đúng cách' " +
    "(đoạn văn) -> H2 'Câu hỏi thường gặp' (3 cặp H3/đoạn văn).",
];

const TONE_VARIANTS = [
  "chuyên nghiệp, điềm đạm, như tư vấn viên y tế/sức khoẻ cá nhân",
  "gần gũi, thân thiện, như đang tư vấn trực tiếp cho khách hàng mới",
  "tập trung dữ liệu kỹ thuật, ít cảm thán, thiên về thông số và sự thật",
  "tự tin, súc tích, câu ngắn, đi thẳng vào lợi ích cho người dùng",
];

const FOCUS_ANGLE_VARIANTS = [
  "nhấn mạnh sự an toàn của chất liệu và tiêu chuẩn kiểm định",
  "nhấn mạnh trải nghiệm thực tế và cảm giác khi sử dụng",
  "nhấn mạnh sự tiện lợi, dễ dùng cho người mới bắt đầu",
  "nhấn mạnh độ bền, khả năng vệ sinh và bảo quản lâu dài",
  "nhấn mạnh thiết kế/công nghệ đặc trưng của sản phẩm",
];

const OPENING_HOOK_VARIANTS = [
  "mở bài bằng cách trả lời thẳng câu hỏi sản phẩm dùng để làm gì",
  "mở bài bằng 1 câu nêu vấn đề/nhu cầu người dùng đang gặp, rồi dẫn vào sản phẩm",
  "mở bài bằng cách nêu điểm khác biệt lớn nhất của sản phẩm so với loại thông thường",
  "mở bài bằng cách mô tả nhanh đối tượng phù hợp nhất với sản phẩm này",
];

function buildRelatedLinkHint(related) {
  if (related.length === 0) return "";
  const lines = related
    .map((r) => `- ${r.name}: ${SITE_URL}/product/${r.slug}`)
    .join("\n");
  return `Sản phẩm liên quan có thể chèn link (đúng số lượng, không thêm không bớt):\n${lines}`;
}

function buildUserPrompt({ title, category, relatedLinkHint, oldContent }) {
  return `Tên sản phẩm: ${title}
Danh mục: ${category}
${relatedLinkHint}

Yêu cầu cho lần viết này (PHẢI tuân thủ để nội dung không trùng khuôn với
các sản phẩm khác đã viết trước đó):
- Bố cục: ${pickRandom(STRUCTURE_VARIANTS)}
- Giọng văn: ${pickRandom(TONE_VARIANTS)}
- Góc nhấn mạnh chính xuyên suốt bài: ${pickRandom(FOCUS_ANGLE_VARIANTS)}
- Kiểu mở đầu đoạn trả lời trực tiếp: ${pickRandom(OPENING_HOOK_VARIANTS)}

Mô tả HTML hiện tại (cần viết lại theo văn phong mới, không copy nguyên câu):
---
${oldContent}
---

Hãy viết lại toàn bộ mô tả chi tiết trên theo đúng yêu cầu ở system prompt
và đúng bố cục/giọng văn/góc nhấn/kiểu mở đầu được chỉ định ở trên.`;
}

// ============ Goi API ============

async function callOnce({ title, category, relatedLinkHint, oldContent }, endpointUrl) {
  const headers = { "Content-Type": "application/json" };
  if (LOCAL_API_KEY) headers.Authorization = `Bearer ${LOCAL_API_KEY}`;

  const res = await fetch(endpointUrl, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildUserPrompt({ title, category, relatedLinkHint, oldContent }) },
      ],
    }),
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} (${endpointUrl}): ${await res.text()}`);
  }

  const data = await res.json();
  let text = data.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("Khong nhan duoc noi dung tu server.");

  text = text.replace(/^```html\s*/i, "").replace(/```$/i, "").trim();
  text = text.replace(/href="\[([^\]]+)\]\([^)]+\)"/g, 'href="$1"');

  return text;
}

function looksLikeCanvasPlaceholder(text) {
  return (
    !text.startsWith("<") ||
    text.includes("immersive_entry_chip") ||
    text.includes("googleusercontent.com") ||
    /^i will now/i.test(text.trim())
  );
}

async function rewriteOne(input) {
  const MAX_ATTEMPTS = Math.max(3, LOCAL_API_URLS.length * 2);
  let lastErr = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const endpointUrl = nextEndpoint(); // xoay vong qua cac instance/tai khoan
    try {
      const text = await callOnce(input, endpointUrl);
      if (!looksLikeCanvasPlaceholder(text)) {
        return text;
      }
      lastErr = new Error(`Canvas placeholder tu ${endpointUrl}: "${text.slice(0, 120)}"`);
      console.log(`  (Bị chặn Canvas/Immersive ở ${endpointUrl}, thử endpoint khác, lần ${attempt}/${MAX_ATTEMPTS}...)`);
    } catch (e) {
      lastErr = e;
      console.log(`  (Lỗi ở ${endpointUrl}: ${e.message} — thử endpoint khác, lần ${attempt}/${MAX_ATTEMPTS}...)`);
    }
    await sleep(2000);
  }

  throw lastErr || new Error("Khong ro nguyen nhan loi.");
}

// ============ Doc file, tach block, ghi lai ============

async function main() {
  let content = await fs.readFile(FILE_PATH, "utf8");

  const slugMatches = [...content.matchAll(/slug:\s*"([^"]+)"/g)];

  const blocks = slugMatches.map((m, i) => {
    const start = m.index;
    const end = i + 1 < slugMatches.length ? slugMatches[i + 1].index : content.length;
    return { slug: m[1], start, end, text: content.slice(start, end) };
  });

  // Danh sach TOAN BO san pham (khong gioi han limit) - dung de tim san
  // pham lien quan cung danh muc cho phan internal link.
  const allProducts = blocks
    .filter((b) => /sku:\s*"/.test(b.text))
    .map((b) => ({
      slug: b.slug,
      name: (b.text.match(/name:\s*"([^"]+)"/) || [])[1],
      categorySlug: (b.text.match(/categorySlug:\s*"([^"]+)"/) || [])[1],
      category: (b.text.match(/category:\s*"([^"]+)"/) || [])[1],
    }));

  const replacements = [];
  for (const block of blocks) {
    if (replacements.length >= limit) break;

    const nameMatch = block.text.match(/name:\s*"([^"]+)"/);
    const categoryMatch = block.text.match(/category:\s*"([^"]+)"/);
    const categorySlugMatch = block.text.match(/categorySlug:\s*"([^"]+)"/);
    const descMatch = block.text.match(/longDescription:\s*`([\s\S]*?)`,/);
    const isProduct = /sku:\s*"/.test(block.text);
    if (!nameMatch || !descMatch || !isProduct) continue;
    if (!force && isAlreadyHtml(descMatch[1])) continue; // da xu ly roi, bo qua khi chay lai

    const sameCategory = allProducts.filter(
      (p) => p.categorySlug === (categorySlugMatch && categorySlugMatch[1]) && p.slug !== block.slug
    );
    const related = sameCategory.sort(() => Math.random() - 0.5).slice(0, 2);

    replacements.push({
      slug: block.slug,
      name: nameMatch[1],
      category: categoryMatch ? categoryMatch[1] : "",
      relatedLinkHint: buildRelatedLinkHint(related),
      oldText: descMatch[1],
      descStart: block.start + descMatch.index,
      descFull: descMatch[0],
    });
  }

  console.log(`Tim thay ${replacements.length} san pham can xu ly (da bo qua san pham lam roi, tru khi dung --force).`);

  const ordered = [...replacements].reverse(); // xu ly nguoc de index khong lech

  if (!isDry && ordered.length > 0) {
    const backupPath = FILE_PATH + `.backup-${Date.now()}`;
    await fs.copyFile(FILE_PATH, backupPath);
    console.log(`Đã sao lưu file gốc (1 lần, trước khi bắt đầu) tại: ${backupPath}`);
  }

  let done = 0;
  for (const item of ordered) {
    console.log(`\n→ [${done + 1}/${ordered.length}] ${item.slug} (${item.name})`);
    try {
      const newText = await rewriteOne({
        title: item.name,
        category: item.category,
        relatedLinkHint: item.relatedLinkHint,
        oldContent: item.oldText,
      });

      if (isDry) {
        console.log("--- KET QUA (dry run, chua ghi file) ---");
        console.log(newText.slice(0, 700) + (newText.length > 700 ? "..." : ""));
      } else {
        const safe = newText.replace(/`/g, "\\`").replace(/\$\{/g, "\\${");
        const newDescBlock = `longDescription: \`${safe}\`,`;
        content =
          content.slice(0, item.descStart) +
          newDescBlock +
          content.slice(item.descStart + item.descFull.length);

        // Ghi ngay xuong dia sau MOI san pham - lo dut giua chung (mat mang,
        // het han cookie, tat may...) thi phan da lam van duoc giu lai,
        // chay lai lenh se tu bo qua nhung cai da xong (isAlreadyHtml).
        await fs.writeFile(FILE_PATH, content, "utf8");
        console.log(`  Đã ghi vào ${FILE_PATH} (${done + 1}/${ordered.length}).`);
      }
    } catch (e) {
      console.error(`  Lỗi ở ${item.slug}:`, e.message);
      console.log("  Bỏ qua, giữ nguyên nội dung cũ, chuyển sản phẩm tiếp theo.");
    }

    done++;
    await sleep(DELAY_MS);
  }

  if (isDry) {
    console.log("\n(Dry run — không có gì được ghi vào file)");
  } else {
    console.log(`\nHoàn tất: đã xử lý ${done}/${ordered.length} sản phẩm.`);
  }
}

main().catch((e) => {
  console.error("Lỗi:", e);
  process.exit(1);
});
