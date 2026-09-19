import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { streamText, tool } from "ai";
import { z } from "zod";
import { site } from "@/lib/site";
import { products } from "@/data/products";

export const maxDuration = 30;

const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    const result = streamText({
      model: google("gemini-3.6-flash"), // Dùng model 2.0 mới nhất chuẩn xác
      system: `Bạn là trợ lý tư vấn của ${site.name}.
QUY TẮC BẮT BỘC:
- TUYỆT ĐỐI KHÔNG tự viết tên sản phẩm hay link văn bản.
- BẮT BỘC luôn luôn gọi tool 'searchProducts' để trả về thẻ sản phẩm.
- Tin nhắn văn bản chỉ viết tối đa 1 CÂU NGẮN (VD: "Dạ shop gửi bạn xem các mẫu tốt nhất ạ:").`,
      messages,
      maxSteps: 5,
      tools: {
        searchProducts: tool({
          description: "Tìm và trả về danh sách sản phẩm.",
          parameters: z.object({
            keyword: z.string().optional(),
            maxPrice: z.number().optional(),
          }),
          execute: async ({ keyword, maxPrice }) => {
            let list = products;
            if (keyword) {
              const kw = keyword.toLowerCase();
              list = list.filter((p) => p.name.toLowerCase().includes(kw));
            }
            if (maxPrice) {
              list = list.filter((p) => p.price <= maxPrice);
            }
            return (list.length ? list : products).slice(0, 3).map((p) => ({
              id: p.id,
              name: p.name,
              price: p.price,
              url: `${site.url}/san-pham/${p.slug}`,
              image: p.image,
            }));
          },
        }),
      },
    });

    return result.toDataStreamResponse();
  } catch (error) {
    console.error("AI Route Error:", error);
    return new Response(JSON.stringify({ error: "Lỗi kết nối AI" }), { status: 500 });
  }
}