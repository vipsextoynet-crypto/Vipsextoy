import Link from "next/link";
import { products } from "@/data/products";
import ProductsListClient from "@/components/admin/ProductsListClient";

export const dynamic = "force-dynamic";

export default function AdminProductsPage() {
  const list = products.map((p) => ({
    slug: p.slug,
    name: p.name,
    sku: p.sku,
    price: p.price,
    category: p.category,
    image: p.image,
    icon: p.icon,
  }));

  return (
    <main className="mx-auto max-w-4xl px-5 py-14">
      <div className="mb-6 flex items-center justify-between">
        <Link href="/admin" className="text-sm text-muted hover:text-ivory">
          ← Quay lại
        </Link>
        <Link
          href="/admin/products/new"
          className="bg-cta px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
        >
          + Thêm sản phẩm
        </Link>
      </div>

      <h1 className="mb-1 font-serif text-2xl text-ivory">Tất cả sản phẩm</h1>
      <p className="mb-6 text-sm text-muted">{list.length} sản phẩm — bấm vào 1 sản phẩm để sửa.</p>

      <ProductsListClient products={list} />
    </main>
  );
}
