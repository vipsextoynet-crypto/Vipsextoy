import { NextRequest, NextResponse } from "next/server";
import { site } from "@/lib/site";
import { products } from "@/data/products";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const messages: { role: "user" | "model"; text: string }[] = body?.messages;

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "Thiếu thông tin tin nhắn." }, { status: 400 });
    }

    const lastUserMessage = messages[messages.length - 1].text.toLowerCase();

    // Lọc sản phẩm theo tên hoặc danh mục
    let matchedProducts = products.filter((p: any) =>
      p.name?.toLowerCase().includes(lastUserMessage) ||
      (p.category && p.category.toLowerCase().includes(lastUserMessage))
    );

    // Nếu không khớp từ khóa, lấy 3 sản phẩm mặc định
    if (matchedProducts.length === 0) {
      matchedProducts = products.slice(0, 3);
    } else {
      matchedProducts = matchedProducts.slice(0, 3);
    }

    const formattedProducts = matchedProducts.map((p: any, index: number) => ({
      id: p.id || p.slug || `prod-${index}`,
      name: p.name,
      price: p.price,
      url: `${site.url}/san-pham/${p.slug}`,
      image: p.image || p.images?.[0] || "",
    }));

    return NextResponse.json({
      reply: "Dạ shop gửi bạn danh sách sản phẩm phù hợp nhất ạ:",
      products: formattedProducts,
    });
  } catch (err) {
    return NextResponse.json({ error: "Lỗi kết nối máy chủ." }, { status: 500 });
  }
}