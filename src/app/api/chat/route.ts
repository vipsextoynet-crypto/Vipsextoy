import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { site } from "@/lib/site";
import { categories } from "@/data/products";

export const runtime = "nodejs";

// Danh sách các model hỗ trợ, nếu model này bận 503 sẽ tự động chuyển sang model tiếp theo
const MODELS_TO_TRY = [
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-flash-latest",
  "gemini-3.6-flash"
];

function buildSystemPrompt() {
  // Tạo danh sách danh mục kèm đường link URL cụ thể
  const categoryList = categories
    .map((c) => `- ${c.name}: ${c.shortDescription} (Link: ${site.url}/danh-muc/${c.slug || ""})`)
    .join("\n");

  return `Bạn là nhân viên tư vấn bán hàng của ${site.name} (${site.url}).

THÔNG TIN CỬA HÀNG:
${site.description}
- Hotline/Zalo: ${site.phone}
- Giờ làm việc: ${site.hours}
- Giao hàng: Đóng gói kín đáo, không in tên sản phẩm ra ngoài.

DANH MỤC SẢN PHẨM & ĐƯỜNG LINK:
${categoryList}

CÁCH TƯ VẤN BẮT BỘC:
1. TRẢ LỜI CỰC KỲ NGẮN GỌN (Tối đa 2 câu). Không chào hỏi dài dòng.
2. Khi tư vấn danh mục sản phẩm, BẮT BỘC chèn đường link tương ứng dưới dạng Markdown: [Tên danh mục](URL) để khách hàng nhấp vào xem sản phẩm.
   Ví dụ: "Bạn tham khảo các mẫu giá dưới 500k tại [Danh mục Trứng Rung](${site.url}/danh-muc/trung-rung) nhé!"
3. Không tự bịa tên sản phẩm, mã SKU hay giá chi tiết.
4. Xưng "shop" và gọi khách là "bạn".`;
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Chatbot chưa được cấu hình (thiếu GEMINI_API_KEY)." },
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

  // Cơ chế Thử lại (Retry Loop) qua nhiều Model khác nhau khi bị lỗi 503 quá tải
  for (const model of MODELS_TO_TRY) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await ai.models.generateContent({
          model,
          contents,
          config: {
            systemInstruction: buildSystemPrompt(),
            maxOutputTokens: 250,
          },
        });

        const text = res.text?.trim();
        if (text) {
          return NextResponse.json({ reply: text });
        }
      } catch (e) {
        lastErr = e;
        // Chờ 500ms trước khi thử lại nếu bị nghẽn
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }
  }

  return NextResponse.json(
    {
      error: "Hệ thống AI đang quá tải, bạn vui lòng bấm lại hoặc nhắn Zalo/Hotline giúp shop nhé!",
    },
    { status: 500 }
  );
}