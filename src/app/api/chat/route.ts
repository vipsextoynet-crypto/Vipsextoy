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

  return `Bạn là nhân viên tư vấn bán hàng của ${site.name} (${site.url}).

THÔNG TIN CỬA HÀNG:
${site.description}
- Hotline/Zalo: ${site.phone}
- Giờ làm việc: ${site.hours}
- Giao hàng: Đóng gói kín đáo, không ghi tên sản phẩm.

DANH MỤC & LINK WEBSITE:
${categoryList}

QUY TẮC BẮT BỘC:
1. Viết ngắn gọn (1-3 câu). Trả lời thẳng vào câu hỏi của khách.
2. Khi giới thiệu danh mục, BẮT BỘC chèn link dạng Markdown: [Tên danh mục](URL) để khách nhấp vào.
   Ví dụ: "Bạn xem các mẫu tại [Trứng Rung Tình Yêu](${site.url}/danh-muc/trung-rung) nhé."
3. Không tự chế tên sản phẩm cụ thể hay giá chi tiết.
4. Xưng "shop" và gọi "bạn".`;
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Thiếu GEMINI_API_KEY." },
      { status: 500 }
    );
  }

  const body = await req.json().catch(() => null);
  const messages: { role: "user" | "model"; text: string }[] = body?.messages;

  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "Thiếu nội dung tin nhắn." }, { status: 400 });
  }

  // Chỉ lấy 6 tin gần nhất để giữ context gọn nhẹ
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
          maxOutputTokens: 600, // Tăng lên 600 để đảm bảo không bị cụt câu
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
      error: "Hệ thống AI đang bận, vui lòng thử lại hoặc nhắn Zalo/Hotline giúp shop nhé!",
    },
    { status: 500 }
  );
}