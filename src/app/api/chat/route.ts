import { google } from "@ai-sdk/google";
import { streamText, tool } from "ai";
import { z } from "zod";
import { site } from "@/lib/site";
import { products } from "@/data/products";

export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model: google("gemini-3.6-flash"),
    system: `Bạn là trợ lý tư vấn của ${site.name}.
QUY TẮC CỐ ĐỊNH:
- KHÔNG được liệt kê tên sản phẩm bằng chữ hay viết link văn bản.
- BẮT BỘC dùng tool 'searchProducts' để trả về thẻ danh sách sản phẩm.
- Chỉ viết đúng 1 câu duy nhất: "Dạ shop gợi ý mẫu tốt nhất cho bạn đây ạ:"`,
    messages,
    maxSteps: 5, // Bắt buộc AI gọi tool lấy sản phẩm trước khi trả tin nhắn
    tools: {
      searchProducts: tool({
        description: "Lấy danh sách sản phẩm thực tế có sẵn trong shop.",
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
          // Lấy 3 sản phẩm phù hợp nhất
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
}