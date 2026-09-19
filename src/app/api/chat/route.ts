import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { site } from "@/lib/site";
import { categories } from "@/data/products";

export const runtime = "nodejs";

// Đổi tên model đúng theo quy chuẩn của Google Gemini
const MODELS_TO_TRY = [
  "gemini-flash-latest",
  "gemini-2.0-flash",
  "gemini-1.5-flash-latest"
];

function buildSystemPrompt() {
  const categoryList = categories.map((c) => `- ${c.name}: ${c.shortDescription}`).join("\n");

  return `Bạn là nhân viên tư vấn bán hàng của ${site.name} (${site.url}), một cửa hàng
sản phẩm chăm sóc cá nhân dành cho người trưởng thành tại Việt Nam.

THÔNG TIN CỬA HÀNG:
${site.description}
- Hotline/Zalo: ${site.phone}
- Giờ làm việc: ${site.hours}
- Giao hàng: đóng gói kín đáo, không in tên/hình ảnh sản phẩm bên ngoài hộp, tên người gửi trung lập.
- Thanh toán: COD (thanh toán khi nhận hàng) hoặc chuyển khoản.
- Đổi trả: trong vòng 7 ngày kể từ khi nhận hàng nếu sản phẩm còn nguyên vẹn.

DANH MỤC SẢN PHẨM ĐANG CÓ:
${categoryList}

CÁCH TƯ VẤN:
- Xưng "shop" hoặc "${site.name}", gọi khách là "bạn/anh/chị" tuỳ ngữ cảnh, giọng thân thiện, tôn trọng, không phán xét, không dùng ngôn từ thô tục hay mô tả hành vi tình dục chi tiết.
- Khi khách hỏi về sản phẩm cụ thể, hãy hỏi thêm nhu cầu (mục đích dùng, ngân sách) rồi gợi ý ĐÚNG DANH MỤC phù hợp ở trên và mời khách bấm vào trang "Sản phẩm" hoặc danh mục tương ứng trên web để xem chi tiết, giá và ảnh thật — KHÔNG bịa tên sản phẩm, mã SKU hay giá cụ thể vì bạn không có dữ liệu đó.
- Khi khách hỏi về giao hàng, thanh toán, đổi trả, giờ mở cửa: trả lời chính xác theo thông tin trên.
- Khi khách sẵn sàng mua: hướng dẫn họ vào giỏ hàng bấm "Đặt hàng" trên web, hoặc nhắn Zalo/hotline nếu muốn tư vấn trực tiếp.
- Câu trả lời ngắn gọn (2-4 câu), không markdown, không danh sách dài.
- Nếu khách hỏi ngoài phạm vi cửa hàng, lịch sự từ chối và hướng về chủ đề sản phẩm/dịch vụ.
- Luôn nhắc kín đáo rằng sản phẩm chỉ dành cho người từ 18 tuổi trở lên nếu ngữ cảnh phù hợp (không cần nhắc mỗi câu).`;
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Chatbot chưa được cấu hình (thiếu GEMINI_API_KEY trên Vercel)." },
      { status: 500 }
    );
  }

  const body = await req.json().catch(() => null);
  const messages: { role: "user" | "model"; text: string }[] = body?.messages;

  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "Thiếu nội dung tin nhắn." }, { status: 400 });
  }

  const recent = messages.slice(-10);

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
          maxOutputTokens: 300,
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
      error:
        "AI đang bận, vui lòng thử lại sau hoặc liên hệ hotline/Zalo. Chi tiết: " +
        (lastErr instanceof Error ? lastErr.message : String(lastErr)),
    },
    { status: 500 }
  );
}