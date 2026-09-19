import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { site } from "@/lib/site";
import { categories } from "@/data/products";

export const runtime = "nodejs";

const MODELS_TO_TRY = [
  "gemini-2.5-flash",
  "gemini-3.6-flash",
  "gemini-flash-latest"
];

function buildSystemPrompt() {
  const categoryList = categories
    .map((c) => `- ${c.name}: ${site.url}/danh-muc/${c.slug || ""}`)
    .join("\n");

  return `Bạn là trợ lý tư vấn bán hàng của ${site.name} (${site.url}).

DANH MỤC SẢN PHẨM & LINK TRUY CẬP:
${categoryList}

QUY TẮC BẮT BỘC KHI TRẢ LỜI:
1. Trả lời đầy đủ, hoàn chỉnh câu. Tuyệt đối không được bỏ dở câu giữa chừng.
2. Khi khách hỏi liệt kê hoặc xem mẫu sản phẩm, hãy giới thiệu các loại nhóm sản phẩm (Ví dụ: dòng điều khiển từ xa, dòng kết nối app, dòng cao cấp) và gửi kèm link danh mục chuẩn dưới dạng Markdown [Tên danh mục](URL) để khách nhấp vào.
   Ví dụ: "Shop có các dòng trứng rung điều khiển từ xa, kết nối app và cao cấp. Bạn nhấp vào [Trứng Rung Tình Yêu](${site.url}/danh-muc/trung-rung) để xem danh sách chi tiết kèm giá nhé!"
3. Giữ câu trả lời súc tích (2-4 câu), thân thiện, tôn trọng.`;
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Chưa cấu hình GEMINI_API_KEY." },
      { status: 500 }
    );
  }

  const body = await req.json().catch(() => null);
  const messages: { role: "user" | "model"; text: string }[] = body?.messages;

  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "Thiếu nội dung tin nhắn." }, { status: 400 });
  }

  const recent = messages.slice(-6);
  const ai = new GoogleGenAI({ apiKey });
  const contents = recent.map((m) => ({
    role: m.role,
    parts: [{ text: m.text }],
  }));

  let lastErr: unknown = null;

  for (const model of MODELS_TO_TRY) {
    try {
      const res = await ai.models.generateContent({
        model,
        contents,
        config: {
          systemInstruction: buildSystemPrompt(),
          maxOutputTokens: 1000, // Tăng lên 1000 token để AI không bao giờ bị cắt câu
        },
      });

      const text = res.text?.trim();
      if (text) {
        return NextResponse.json({ reply: text });
      }
    } catch (e) {
      lastErr = e;
    }
  }

  return NextResponse.json(
    {
      error: "Hệ thống AI đang bận, vui lòng thử lại sau giây lát!",
    },
    { status: 500 }
  );
}