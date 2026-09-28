import type { Metadata } from "next";
import { products } from "@/data/products";
import ProductCard from "@/components/ProductCard";
import Pagination from "@/components/Pagination";

// Next.js 15+/16: searchParams la Promise, phai await moi doc duoc.
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>;
}): Promise<Metadata> {
  const sp = await searchParams;
  const hasQuery = Boolean(sp.q?.trim());
  const page = parseInt(sp.page ?? "1", 10) || 1;
  const shouldNoIndex = hasQuery || page > 1;

  return {
    title: "Cửa hàng",
    description:
      "Toàn bộ sản phẩm chăm sóc cá nhân tại Vipsextoy — đa dạng danh mục, chất liệu an toàn, giao hàng kín đáo toàn quốc.",
    alternates: { canonical: "/shop" },
    robots: shouldNoIndex
      ? { index: false, follow: true }
      : { index: true, follow: true },
  };
}
const PAGE_SIZE = 24;

function normalize(s: string) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .toLowerCase();
}

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();

  // Tim theo tung tu: san pham phai chua TAT CA cac tu khoa (khong can dung
  // thu tu, khong phan biet hoa/thuong, khong phan biet dau tieng Viet).
  const words = normalize(q).split(/\s+/).filter(Boolean);
  const filtered = words.length
    ? products.filter((p) => {
        const hay = normalize(`${p.name} ${p.sku ?? ""}`);
        return words.every((w) => hay.includes(w));
      })
    : products;

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const page = Math.min(
    totalPages,
    Math.max(1, parseInt(sp.page ?? "1", 10) || 1)
  );
  const start = (page - 1) * PAGE_SIZE;
  const list = filtered.slice(start, start + PAGE_SIZE);
  const basePath = q ? `/shop?q=${encodeURIComponent(q)}` : "/shop";

  return (
    <div className="mx-auto max-w-6xl px-5 py-8 md:py-14">
      <div className="mb-8">
        <h1 className="font-serif text-2xl text-ivory md:text-3xl">
          {q ? `Kết quả cho “${q}”` : "Toàn bộ sản phẩm"}
        </h1>
        <p className="mt-2 text-xs text-muted">{filtered.length} sản phẩm</p>
      </div>

      {list.length === 0 ? (
        <p className="text-muted">Không tìm thấy sản phẩm phù hợp.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
          {list.map((p, i) => (
            <ProductCard key={p.slug} product={p} priority={page === 1 && !q && i < 4} />
          ))}
        </div>
      )}
      <Pagination basePath={basePath} currentPage={page} totalPages={totalPages} />
    </div>
  );
}
