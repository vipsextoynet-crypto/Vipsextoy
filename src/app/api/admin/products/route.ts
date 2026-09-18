import { NextRequest, NextResponse } from "next/server";
import { Product, products, categories } from "@/data/products";
import { getFile, commitFile } from "@/lib/github-commit";
import { slugify, productToTs, insertProductIntoSource } from "@/lib/product-serialize";

const PRODUCTS_PATH = "src/data/products.ts";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);

  if (!body) {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ." }, { status: 400 });
  }

  const { name, categorySlug, price, blurb, description, features, icon, badge, image, images, sku, sensitive } = body;

  if (!name || !categorySlug || !price || !description) {
    return NextResponse.json(
      { error: "Vui lòng điền đầy đủ: tên sản phẩm, danh mục, giá, mô tả chi tiết." },
      { status: 400 }
    );
  }

  const category = categories.find((c) => c.slug === categorySlug);
  if (!category) {
    return NextResponse.json({ error: "Danh mục không hợp lệ." }, { status: 400 });
  }

  const baseSlug = slugify(name);
  let slug = baseSlug;
  let n = 2;
  while (products.some((p) => p.slug === slug)) {
    slug = `${baseSlug}-${n}`;
    n++;
  }

  const product: Product = {
    slug,
    sku: sku || slug.slice(0, 8).toUpperCase(),
    name,
    category: category.name,
    categorySlug: category.slug,
    price: Number(price),
    ...(body.compareAt ? { compareAt: Number(body.compareAt) } : {}),
    blurb: blurb || description.slice(0, 120),
    description,
    features: Array.isArray(features) && features.length > 0
      ? features
      : ["Chất lượng cao", "Đóng gói kín đáo", "Giao hàng nhanh toàn quốc"],
    icon: icon || "wave",
    ...(badge ? { badge } : {}),
    ...(image ? { image } : {}),
    ...(Array.isArray(images) && images.length > 0 ? { images } : {}),
    ...(sensitive ? { sensitive: true } : {}),
  };

  try {
    const { content, sha } = await getFile(PRODUCTS_PATH);
    const newContent = insertProductIntoSource(content, productToTs(product));

    await commitFile(
      PRODUCTS_PATH,
      newContent,
      sha,
      `feat: them san pham "${name}" tu trang admin`
    );
  } catch (err) {
    return NextResponse.json(
      {
        error:
          "Không lưu được lên GitHub. Kiểm tra lại GITHUB_TOKEN / GITHUB_REPO / GITHUB_BRANCH trong Vercel Settings. Chi tiết: " +
          (err instanceof Error ? err.message : String(err)),
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, slug });
}
