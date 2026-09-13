import type { Metadata } from "next";
import { products } from "@/data/products";
import ProductCard from "@/components/ProductCard";
import Sidebar from "@/components/Sidebar";
import Pagination from "@/components/Pagination";

export const metadata: Metadata = {
  title: "Cửa hàng",
  description:
    "Toàn bộ sản phẩm chăm sóc cá nhân tại Vipextoy — đa dạng danh mục, chất liệu an toàn, giao hàng kín đáo toàn quốc.",
  alternates: { canonical: "/shop" },
};

const PAGE_SIZE = 24;

function normalize(s: string) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export default function ShopPage({
  searchParams,
}: {
  searchParams: { page?: string; q?: string };
}) {
  const q = (searchParams.q ?? "").trim();
  const filtered = q
    ? products.filter((p) => normalize(p.name).includes(normalize(q)))
    : products;

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const page = Math.min(
    totalPages,
    Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1)
  );
  const start = (page - 1) * PAGE_SIZE;
  const list = filtered.slice(start, start + PAGE_SIZE);
  const basePath = q ? `/shop?q=${encodeURIComponent(q)}` : "/shop";

  return (
    <div className="mx-auto max-w-6xl px-5 py-14">
      <div className="mb-10">
        <p className="text-xs uppercase tracking-wide text-gold">Cửa hàng</p>
        <h1 className="mt-2 font-serif text-3xl text-ivory">
          {q ? `Kết quả cho “${q}”` : "Toàn bộ sản phẩm"}
        </h1>
        <p className="mt-3 max-w-xl text-muted">
          {filtered.length} sản phẩm — duyệt theo danh mục bên trái để tìm
          nhanh hơn.
        </p>
      </div>

      <div className="flex flex-col gap-8 md:flex-row">
        <Sidebar />
        <div className="flex-1">
          {list.length === 0 ? (
            <p className="text-muted">Không tìm thấy sản phẩm phù hợp.</p>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {list.map((p) => (
                <ProductCard key={p.slug} product={p} />
              ))}
            </div>
          )}
          <Pagination basePath={basePath} currentPage={page} totalPages={totalPages} />
        </div>
      </div>
    </div>
  );
}
