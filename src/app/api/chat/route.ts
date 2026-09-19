import { google } from "@ai-sdk/google";
import { streamText, tool } from "ai";
import { z } from "zz";
import { site } from "@/lib/site";
import { categories, products } from "@/data/products"; // Giả sử bạn có mảng products

export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model: google("gemini-3.6-flash"),
    system: `Bạn là trợ lý tư vấn bán hàng của shop ${site.name} (${site.url}).
    
NHIỆM VỤ:
- Khi khách hỏi tìm sản phẩm, tư vấn theo ngân sách hoặc tính năng, BẮT BỘC dùng tool \`searchProducts\` để tìm sản phẩm thực tế trong cửa hàng.
- Sau khi tìm thấy, gợi ý 1-3 sản phẩm phù hợp nhất, nêu ngắn gọn điểm nổi bật.
- Trả lời ngắn gọn, thân thiện (2-3 câu). Xưng "shop", gọi khách là "bạn".`,
    messages,
    tools: {
      searchProducts: tool({
        description: "Tìm kiếm sản phẩm theo từ khóa hoặc khoảng giá trong kho dữ liệu của shop.",
        parameters: z.object({
          keyword: z.string().optional().describe("Từ khóa tìm kiếm (ví dụ: trứng rung, bao cao su)"),
          maxPrice: z.number().optional().describe("Mức giá tối đa khách yêu cầu (VND)"),
        }),
        execute: async ({ keyword, maxPrice }) => {
          let filtered = products;

          if (keyword) {
            const kw = keyword.toLowerCase();
            filtered = filtered.filter(
              (p) => p.name.toLowerCase().includes(kw) || p.category.toLowerCase().includes(kw)
            );
          }

          if (maxPrice) {
            filtered = filtered.filter((p) => p.price <= maxPrice);
          }

          // Trả về tối đa 4 sản phẩm phù hợp nhất
          return filtered.slice(0, 4).map((p) => ({
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