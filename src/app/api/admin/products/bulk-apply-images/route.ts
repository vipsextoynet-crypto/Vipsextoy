import { NextRequest, NextResponse } from "next/server";
import { products } from "@/data/products";
import { getFile, commitFile } from "@/lib/github-commit";
import { productToTs, replaceProductInSource } from "@/lib/product-serialize";

const PRODUCTS_PATH = "src/data/products.ts";

type Item = { sku: string; urls: string[] };

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const items: Item[] = body?.items;

  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "Không có dữ liệu để áp dụng." }, { status: 400 });
  }

  const matched: { sku: string; slug: string; name: string }[] = [];
  const unmatched: string[] = [];

  try {
    const { content, sha } = await getFile(PRODUCTS_PATH);
    let newContent = content;

    for (const item of items) {
      const product = products.find(
        (p) => p.sku.toLowerCase() === item.sku.toLowerCase()
      );

      if (!product || item.urls.length === 0) {
        unmatched.push(item.sku);
        continue;
      }

      const updated = {
        ...product,
        image: item.urls[0],
        images: item.urls.slice(1),
      };

      newContent = replaceProductInSource(newContent, product.slug, productToTs(updated));
      matched.push({ sku: item.sku, slug: product.slug, name: product.name });
    }

    if (matched.length === 0) {
      return NextResponse.json(
        { error: "Không khớp được SKU nào với sản phẩm hiện có.", unmatched },
        { status: 400 }
      );
    }

    await commitFile(
      PRODUCTS_PATH,
      newContent,
      sha,
      `feat: cap nhat anh cho ${matched.length} san pham qua trang admin (bulk upload)`
    );
  } catch (err) {
    return NextResponse.json(
      {
        error:
          "Không lưu được lên GitHub. Chi tiết: " +
          (err instanceof Error ? err.message : String(err)),
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, matched, unmatched });
}
