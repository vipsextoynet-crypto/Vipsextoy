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
    system: `Bạn là trợ lý tư vấn của shop ${site.name}.

QUY TẮC BẮT BỘC:
1. TUYỆT ĐỐI KHÔNG tự mô tả hay bịa tên sản phẩm bằng chữ.
2. BẮT BỘC luôn luôn gọi tool \`searchProducts\` để tìm và trả về thẻ sản phẩm thực tế cho khách nhấp xem.
3. Phần tin nhắn văn bản chỉ viết tối đa 1 CÂU NGẮN GỌN (Ví dụ: "Shop gợi ý sản phẩm tốt nhất cho bạn đây ạ:").`,
    messages,
    tools: {
      searchProducts: tool({
        description: "Bắt buộc gọi hàm này để tìm và hiển thị danh sách sản phẩm thực tế kèm ảnh, giá, link.",
        parameters: z.object({
          keyword: z.string().optional().describe("Từ khóa tìm kiếm sản phẩm"),
          maxPrice: z.number().optional().describe("Mức giá tối đa"),
        }),
        execute: async ({ keyword, maxPrice }) => {
          let filtered = products;

          if (keyword) {
            const kw = keyword.toLowerCase();
            filtered = filtered.filter(
              (p) => p.name.toLowerCase().includes(kw) || (p.category && p.category.toLowerCase().includes(kw))
            );
          }

          if (maxPrice) {
            filtered = filtered.filter((p) => p.price <= maxPrice);
          }

          // Trả về 1-3 sản phẩm phù hợp nhất
          const list = filtered.length > 0 ? filtered : products;
          return list.slice(0, 3).map((p) => ({
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