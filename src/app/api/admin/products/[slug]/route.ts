import { NextRequest, NextResponse } from "next/server";
import { Product, products, categories } from "@/data/products";
import { getFile, commitFile } from "@/lib/github-commit";
import { productToTs, replaceProductInSource, removeProductFromSource } from "@/lib/product-serialize";

const PRODUCTS_PATH = "src/data/products.ts";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const existing = products.find((p) => p.slug === slug);

  if (!existing) {
    return NextResponse.json({ error: "Không tìm thấy sản phẩm." }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ." }, { status: 400 });
  }

  const { name, categorySlug, price, blurb, description, features, icon, badge, image, images, sku, sensitive, compareAt } = body;

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

  const updated: Product = {
    slug, // giu nguyen slug cu, khong doi de khong lam hong link/SEO da co
    sku: sku || existing.sku,
    name,
    category: category.name,
    categorySlug: category.slug,
    price: Number(price),
    ...(compareAt ? { compareAt: Number(compareAt) } : {}),
    // De trong thi de trong (khong tu lay tu mo ta chi tiet)
    blurb: (blurb || "").trim(),
    description,
    features: Array.isArray(features) && features.length > 0 ? features : existing.features,
    icon: icon || existing.icon,
    ...(badge ? { badge } : {}),
    ...(image ? { image } : {}),
    ...(Array.isArray(images) && images.length > 0 ? { images } : {}),
    ...(sensitive ? { sensitive: true } : {}),
  };

  try {
    const { content, sha } = await getFile(PRODUCTS_PATH);
    const newContent = replaceProductInSource(content, slug, productToTs(updated));

    await commitFile(
      PRODUCTS_PATH,
      newContent,
      sha,
      `feat: cap nhat san pham "${name}" tu trang admin`
    );
  } catch (err) {
    return NextResponse.json(
      {
        error:
          "Không lưu được lên GitHub. Kiểm tra lại GITHUB_TOKEN / GITHUB_REPO / GITHUB_BRANCH. Chi tiết: " +
          (err instanceof Error ? err.message : String(err)),
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, slug });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const existing = products.find((p) => p.slug === slug);

  if (!existing) {
    return NextResponse.json({ error: "Không tìm thấy sản phẩm." }, { status: 404 });
  }

  try {
    const { content, sha } = await getFile(PRODUCTS_PATH);
    const newContent = removeProductFromSource(content, slug);

    await commitFile(
      PRODUCTS_PATH,
      newContent,
      sha,
      `feat: xoa san pham "${existing.name}" tu trang admin`
    );
  } catch (err) {
    return NextResponse.json(
      {
        error:
          "Không xoá được trên GitHub. Chi tiết: " +
          (err instanceof Error ? err.message : String(err)),
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
