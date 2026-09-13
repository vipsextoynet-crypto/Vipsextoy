// Script tu dong tao 1 bai blog SEO moi moi ngay, dung cho GitHub Actions.
// Chay: GEMINI_API_KEY=xxx node scripts/generate-daily-post.mjs
//
// Luong hoat dong:
// 1. Doc danh sach 33 chu de trong scripts/seo-topics.json (lay tu du an
//    "vietnamese-sexual-wellness-seo-ai" ban gui).
// 2. Chon chu de ke tiep chua dung (theo dõi qua scripts/seo-progress.json);
//    het 33 chu de se tu quay vong lai tu dau.
// 3. Goi Gemini API de viet 1 bai ~450-650 tu, giong van tu van/huong dan,
//    KHONG noi dung khieu dam (xem systemInstruction ben duoi).
// 4. Ghi bai moi vao dau mang src/data/blog-posts.json (moi nhat len dau).
//
// Luu y an toan: script nay KHONG ghi de safetySettings cua Gemini ve
// BLOCK_NONE nhu file goc trong du an ban gui - de nguyen muc mac dinh cua
// Google lam lop bao ve tu dong, vi day la pipeline chay khong nguoi kiem
// duyet truoc khi len web that. Dieu nay ap dung cho CA phan sinh van ban
// LAN phan sinh anh minh hoa (buoc 5 ben duoi) - anh chi la anh san pham /
// tinh vat phong cach thuong mai, khong mo ta nguoi, khong noi dung nhay cam.
// Neu Gemini tu choi sinh anh (vi cham nguong an toan mac dinh) hoac loi bat
// ky, script se BO QUA anh va bai viet van duoc dang binh thuong voi icon
// glyph nhu truoc gio - khong lam hong ca pipeline.

import { GoogleGenAI, Type, Modality } from "@google/genai";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TOPICS_PATH = path.join(ROOT, "scripts/seo-topics.json");
const PROGRESS_PATH = path.join(ROOT, "scripts/seo-progress.json");
const BLOG_JSON_PATH = path.join(ROOT, "src/data/blog-posts.json");
const BLOG_IMAGES_DIR = path.join(ROOT, "public/blog");

const ICON_BY_CATEGORY = {
  trending: "spark",
  buying: "orb",
  review: "ring",
  lifestyle: "petal",
  guide: "drop",
};
const CATEGORY_LABEL = {
  trending: "Xu hướng",
  buying: "Mua hàng",
  review: "Đánh giá",
  lifestyle: "Góc chia sẻ",
  guide: "Hướng dẫn",
};

function slugify(str) {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function loadJson(p, fallback) {
  try {
    return JSON.parse(fs.readFileSync(p, "utf-8"));
  } catch {
    return fallback;
  }
}

// Sinh anh minh hoa AN TOAN cho bai viet: tinh vat / anh san pham phong cach
// thuong mai (bao bi, hop qua, khong gian toi gian), KHONG mo ta nguoi, KHONG
// noi dung nhay cam. Khong ghi de safetySettings - dung mac dinh cua Gemini.
// Tra ve duong dan public (vd "/blog/slug.jpg") neu thanh cong, hoac null
// neu that bai vi bat ky ly do gi (bai viet van duoc dang, chi khong co anh).
async function generateSafeImage(ai, { title, categoryLabel, slug }) {
  const imagePrompt = `Professional commercial still-life product photography for a personal-care e-commerce blog article titled "${title}" (category: ${categoryLabel}).
Show only: elegant minimalist packaging/box, soft studio lighting, neutral pastel background, plants or soft fabric props, clean editorial e-commerce aesthetic.
Strictly no people, no body parts, no text, no logos, no nudity, no sexual or suggestive content of any kind. Wide 16:9 composition.`;

  const imageModels = ["gemini-2.5-flash-image", "gemini-3.1-flash-lite-image"];
  for (const modelName of imageModels) {
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: { parts: [{ text: imagePrompt }] },
        config: {
          responseModalities: [Modality.IMAGE],
          // KHONG dat safetySettings o day => dung nguong mac dinh cua Google.
        },
      });

      const parts = response.candidates?.[0]?.content?.parts || [];
      for (const part of parts) {
        if (part.inlineData?.data) {
          const ext = (part.inlineData.mimeType || "image/jpeg").includes("png") ? "png" : "jpg";
          fs.mkdirSync(BLOG_IMAGES_DIR, { recursive: true });
          const filePath = path.join(BLOG_IMAGES_DIR, `${slug}.${ext}`);
          fs.writeFileSync(filePath, Buffer.from(part.inlineData.data, "base64"));
          return `/blog/${slug}.${ext}`;
        }
      }
      console.warn(`Model ${modelName} khong tra ve du lieu anh (co the bi loc an toan).`);
    } catch (e) {
      console.warn(`Sinh anh voi model ${modelName} that bai:`, e?.message || e);
    }
  }
  console.warn("Khong sinh duoc anh cho bai viet nay - se dung icon glyph mac dinh.");
  return null;
}

async function main() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Thiếu GEMINI_API_KEY. Vào Settings > Secrets and variables > Actions của repo GitHub để thêm."
    );
  }

  const topics = loadJson(TOPICS_PATH, []);
  if (!topics.length) throw new Error("scripts/seo-topics.json đang rỗng.");

  const progress = loadJson(PROGRESS_PATH, { usedIds: [] });
  let topic = topics.find((t) => !progress.usedIds.includes(t.id));
  if (!topic) {
    console.log("Đã dùng hết danh sách chủ đề, quay vòng lại từ đầu.");
    progress.usedIds = [];
    topic = topics[0];
  }

  const ai = new GoogleGenAI({ apiKey });

  const systemInstruction = `Bạn là biên tập viên nội dung cho một cửa hàng thương mại điện tử HỢP PHÁP, bán sản phẩm chăm sóc cá nhân / sức khỏe tình dục cho người trưởng thành tại Việt Nam.

Nhiệm vụ: viết bài blog SEO theo hướng tư vấn mua hàng, hướng dẫn sử dụng, kiến thức sản phẩm, vệ sinh/bảo quản, chăm sóc sức khỏe — giống văn phong một bài viết tiêu dùng/y tế thông thường.

TUYỆT ĐỐI KHÔNG:
- Mô tả hành vi tình dục hoặc chi tiết nhạy cảm.
- Dùng ngôn ngữ khiêu dâm, kích dục hoặc tục tĩu.
- Kể trải nghiệm cá nhân mang tính gợi dục.

Đối tượng đọc: người trưởng thành trên 18 tuổi tìm hiểu thông tin sản phẩm một cách nghiêm túc.

Trả lời DUY NHẤT bằng JSON đúng schema, không thêm chữ nào khác ngoài JSON.`;

  const prompt = `Chủ đề: "${topic.title}"
Từ khóa chính cần lồng tự nhiên: "${topic.targetKeyword}"

Viết 1 bài blog khoảng 450-650 từ bằng tiếng Việt, giọng văn thân thiện và đáng tin cậy.`;

  const schema = {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING, description: "Tiêu đề bài viết, tự nhiên, chứa từ khóa chính" },
      excerpt: { type: Type.STRING, description: "Tóm tắt 1 câu, dưới 30 từ" },
      content: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "4-6 đoạn văn thuần (không chứa HTML)",
      },
    },
    required: ["title", "excerpt", "content"],
  };

  const modelsToTry = ["gemini-3.7-flash", "gemini-flash-latest", "gemini-3.1-flash-lite"];
  let article = null;
  let lastErr;
  for (const model of modelsToTry) {
    try {
      const res = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: schema,
          temperature: 0.7,
          maxOutputTokens: 4096,
        },
      });
      const raw = res.text || res.candidates?.[0]?.content?.parts?.[0]?.text || "";
      if (!raw.trim()) throw new Error(`Model ${model} trả về rỗng`);
      article = JSON.parse(raw);
      break;
    } catch (e) {
      lastErr = e;
      console.warn(`Model ${model} thất bại:`, e?.message || e);
    }
  }
  if (!article) throw lastErr || new Error("Không tạo được bài viết từ bất kỳ model nào.");

  const dateStr = new Date().toISOString().slice(0, 10);
  const slug = `${slugify(article.title)}-${dateStr}`;
  const wordCount = article.content.join(" ").split(/\s+/).filter(Boolean).length;
  const readTime = `${Math.max(2, Math.round(wordCount / 200))} phút đọc`;

  const categoryLabel = CATEGORY_LABEL[topic.category] || "Kiến thức";
  const imagePath = await generateSafeImage(ai, {
    title: article.title,
    categoryLabel,
    slug,
  });

  const newPost = {
    slug,
    title: article.title,
    excerpt: article.excerpt,
    content: article.content,
    date: dateStr,
    readTime,
    category: categoryLabel,
    icon: ICON_BY_CATEGORY[topic.category] || "wave",
    ...(imagePath ? { image: imagePath } : {}),
  };

  const posts = loadJson(BLOG_JSON_PATH, []);
  posts.unshift(newPost);
  fs.writeFileSync(BLOG_JSON_PATH, JSON.stringify(posts, null, 2) + "\n", "utf-8");

  progress.usedIds.push(topic.id);
  fs.writeFileSync(PROGRESS_PATH, JSON.stringify(progress, null, 2) + "\n", "utf-8");

  console.log(`Đã tạo bài viết mới: "${newPost.title}" (${slug})`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
