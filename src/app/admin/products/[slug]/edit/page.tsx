import Link from "next/link";
import { notFound } from "next/navigation";
import { products } from "@/data/products";
import ProductForm from "@/components/admin/ProductForm";

export const dynamic = "force-dynamic";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = products.find((p) => p.slug === slug);

  if (!product) return notFound();

  return (
    <main className="mx-auto max-w-2xl px-5 py-14">
      <Link href="/admin/products" className="mb-6 inline-block text-sm text-muted hover:text-ivory">
        ← Quay lại danh sách
      </Link>

      <h1 className="mb-2 font-serif text-2xl text-ivory">Sửa sản phẩm</h1>
      <p className="mb-8 text-sm text-muted">{product.name}</p>

      <ProductForm mode="edit" initial={product} />
    </main>
  );
}
