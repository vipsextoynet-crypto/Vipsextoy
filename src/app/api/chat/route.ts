import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { site } from "@/lib/site";
import { categories, products } from "@/data/products";

// Chatbot tu van AI - dung Gemini (mien phi, tan dung lai GEMINI_API_KEY da
// co san cho tinh nang blog tu dong).
//
// Cach hoat dong moi:
// 1. AI luon hoi lai nhu cau cu the (cam tay / hit tuong / gia re / cao cap...)
//    truoc khi goi y, thay vi tra loi chung chung.
// 2. Khi khach nhan tin, server tu loc ra toi da ~12 san pham THAT trong
//    data/products khop voi tu khoa/danh muc khach nhac toi, roi gui danh
//    sach nay cho AI. AI CHI duoc chon trong danh sach nay (khong bia ten,
//    gia, SKU nua) - giai quyet loi "AI tra loi chung chung, khong biet
//    san pham that".
// 3. Khong gui toan bo 1913 san pham (qua nang, ton quota mien phi).

export const runtime = "nodejs";

// Gemini model: giữ nguyên Google SDK @google/genai và model Gemini 3.6 Flash.
const GEMINI_MODEL = "gemini-3.6-flash";

// Có thể đặt nhiều API key trên Vercel:
// GEMINI_API_KEY
// GEMINI_API_KEY_2
// GEMINI_API_KEY_3
// GEMINI_API_KEY_4
// GEMINI_API_KEY_5
//
// Request sẽ thử key lần lượt. Khi gặp lỗi quota/rate-limit/auth,
// key hiện tại sẽ được bỏ qua và thử key tiếp theo.
const GEMINI_KEY_ENV_NAMES = [
  "GEMINI_API_KEY",
  "GEMINI_API_KEY_2",
  "GEMINI_API_KEY_3",
  "GEMINI_API_KEY_4",
  "GEMINI_API_KEY_5",
] as const;

function getGeminiApiKeys(): string[] {
  return GEMINI_KEY_ENV_NAMES
    .map((name) => process.env[name]?.trim())
    .filter((key): key is string => Boolean(key));
}

function shouldRotateGeminiKey(error: unknown): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

  return (
    message.includes("429") ||
    message.includes("quota") ||
    message.includes("rate limit") ||
    message.includes("resource exhausted") ||
    message.includes("too many requests") ||
    message.includes("api key") ||
    message.includes("permission denied") ||
    message.includes("unauthorized") ||
    message.includes("forbidden")
  );
}

// --- Chinh lai phan nay neu ten field trong data/products.ts khac ---
// Gia dinh moi san pham co dang: { name, slug, price, category (ten hoac slug danh muc), shortDescription? }
type Product = {
  name: string;
  slug: string;
  price?: number;
  category?: string;
  shortDescription?: string;
};

function formatPrice(price?: number) {
  if (!price && price !== 0) return "";
  return price.toLocaleString("vi-VN") + "đ";
}

// Loc san pham theo tu khoa nguoi dung vua go (lay tu 1-2 tin nhan gan nhat)
function findRelevantProducts(recentMessages: { role: string; text: string }[], limit = 12): Product[] {
  const userText = recentMessages
    .filter((m) => m.role === "user")
    .slice(-2)
    .map((m) => m.text.toLowerCase())
    .join(" ");

  if (!userText.trim()) return [];

  // Tach tu khoa co nghia (bo qua tu qua ngan)
  const keywords = userText
    .split(/[\s,.!?]+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 2);

  if (keywords.length === 0) return [];

  const scored = (products as Product[])
    .map((p) => {
      const haystack = `${p.name} ${p.category ?? ""} ${p.shortDescription ?? ""}`.toLowerCase();
      const score = keywords.reduce((acc, kw) => (haystack.includes(kw) ? acc + 1 : acc), 0);
      return { p, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, limit).map((x) => x.p);
}

function buildSystemPrompt(matchedProducts: Product[]) {
  const categoryList = categories.map((c) => `- ${c.name}: ${c.shortDescription}`).join("\n");

  const productBlock =
    matchedProducts.length > 0
      ? matchedProducts
          .map((p) => `- ${p.name}${p.price ? ` | ${formatPrice(p.price)}` : ""} | link: ${site.url}/san-pham/${p.slug}`)
          .join("\n")
      : "(chưa có sản phẩm khớp — hãy hỏi thêm nhu cầu trước khi gợi ý)";

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

SẢN PHẨM THẬT KHỚP VỚI YÊU CẦU KHÁCH (chỉ dùng đúng danh sách này, KHÔNG được bịa thêm sản phẩm/giá/SKU khác):
${productBlock}

QUY TRÌNH TƯ VẤN (luôn theo đúng thứ tự):
1. Nếu khách mới nhắc tên loại sản phẩm chung chung (vd "mua dương vật giả") mà CHƯA rõ nhu cầu cụ thể, và danh sách sản phẩm khớp bên trên còn ít/rỗng: đừng liệt kê sản phẩm ngay. Hãy hỏi lại nhu cầu bằng cách đưa ra 3-4 lựa chọn cụ thể, dạng liệt kê ngắn gọn từng dòng để khách dễ chọn, ví dụ: loại cầm tay, loại hít tường, tầm giá rẻ, hay dòng cao cấp/có rung. Điều chỉnh lựa chọn theo đúng danh mục khách đang hỏi.
2. Khi khách đã trả lời rõ nhu cầu (hoặc danh sách sản phẩm khớp bên trên đã có sản phẩm phù hợp): liệt kê 2-3 sản phẩm PHÙ HỢP NHẤT lấy đúng từ danh sách "SẢN PHẨM THẬT" ở trên (tên + giá + link), không thêm sản phẩm ngoài danh sách. Mời khách bấm vào link để xem ảnh thật và đặt hàng.
3. Khi khách hỏi về giao hàng, thanh toán, đổi trả, giờ mở cửa: trả lời chính xác theo thông tin trên.
4. Khi khách sẵn sàng mua: hướng dẫn họ vào giỏ hàng bấm "Đặt hàng" trên web, hoặc nhắn Zalo/hotline nếu muốn tư vấn trực tiếp.
5. Luôn kết thúc câu trả lời trọn vẹn, không viết dở dang. Ngắn gọn (3-5 câu), không markdown, có thể xuống dòng để liệt kê lựa chọn/sản phẩm cho dễ đọc.
6. Xưng "shop", gọi khách là "bạn/anh/chị", giọng thân thiện, tôn trọng, không phán xét, không dùng ngôn từ thô tục hay mô tả hành vi tình dục chi tiết.
7. Nếu khách hỏi ngoài phạm vi cửa hàng, lịch sự từ chối và hướng về chủ đề sản phẩm/dịch vụ.
8. Nhắc kín đáo rằng sản phẩm chỉ dành cho người từ 18 tuổi trở lên nếu ngữ cảnh phù hợp (không cần nhắc mỗi câu).`;
}

export async function POST(req: NextRequest) {
  const apiKeys = getGeminiApiKeys();

  if (apiKeys.length === 0) {
    return NextResponse.json(
      {
        error:
          "Chatbot chưa được cấu hình. Hãy thêm GEMINI_API_KEY trên Vercel (có thể thêm GEMINI_API_KEY_2, _3, _4, _5 để dự phòng).",
      },
      { status: 500 }
    );
  }

  const body = await req.json().catch(() => null);
  const messages: { role: "user" | "model"; text: string }[] = body?.messages;

  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "Thiếu nội dung tin nhắn." }, { status: 400 });
  }

  // Giới hạn lịch sử gửi lên (10 tin gần nhất) để tiết kiệm quota miễn phí.
  const recent = messages.slice(-10);

  const matchedProducts = findRelevantProducts(recent);

  const contents = recent.map((m) => ({
    role: m.role,
    parts: [{ text: m.text }],
  }));

  const systemPrompt = buildSystemPrompt(matchedProducts);
  let lastErr: unknown = null;

  // Thử từng API key với cùng một model Gemini 3.6 Flash.
  // Không dùng model fallback để đảm bảo đúng model mà bạn yêu cầu.
  for (let i = 0; i < apiKeys.length; i++) {
    const apiKey = apiKeys[i];

    try {
      const ai = new GoogleGenAI({ apiKey });

      const res = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents,
        config: {
          systemInstruction: systemPrompt,
          maxOutputTokens: 500,
        },
      });

      const text = res.text?.trim();

      if (text) {
        return NextResponse.json({
          reply: text,
        });
      }

      throw new Error("Gemini không trả về nội dung.");
    } catch (e) {
      lastErr = e;

      console.error(
        `[Gemini] Key ${i + 1}/${apiKeys.length} failed:`,
        e instanceof Error ? e.message : String(e)
      );

      // Chỉ xoay key khi lỗi có khả năng liên quan quota/rate-limit/auth.
      // Các lỗi khác cũng thử key tiếp theo để tăng khả năng phục hồi,
      // nhưng vẫn giữ nguyên model Gemini 3.6 Flash.
      if (!shouldRotateGeminiKey(e) && i === apiKeys.length - 1) {
        break;
      }
    }
  }

  return NextResponse.json(
    {
      error:
        "AI đang bận hoặc API Gemini đã hết quota. Vui lòng thử lại sau hoặc liên hệ hotline/Zalo.",
      detail:
        process.env.NODE_ENV === "development"
          ? lastErr instanceof Error
            ? lastErr.message
            : String(lastErr)
          : undefined,
    },
    { status: 500 }
  );
}
