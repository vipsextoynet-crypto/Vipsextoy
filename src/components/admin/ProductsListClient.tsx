"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { formatPrice } from "@/data/products";

type Row = {
  slug: string;
  name: string;
  sku: string;
  price: number;
  category: string;
  image?: string;
  icon: string;
};

const PAGE_SIZE = 30;

export default function ProductsListClient({ products }: { products: Row[] }) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
    );
  }, [products, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div>
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setPage(1);
        }}
        placeholder="Tìm theo tên, SKU, danh mục..."
        className="mb-4 w-full border border-line bg-surface2 px-3 py-2 text-sm text-ivory outline-none focus:border-gold/50"
      />

      <p className="mb-3 text-xs text-muted">
        Tìm thấy {filtered.length} sản phẩm — trang {currentPage}/{totalPages}
      </p>

      <div className="flex flex-col divide-y divide-line border border-line bg-surface">
        {pageItems.map((p) => (
          <Link
            key={p.slug}
            href={`/admin/products/${p.slug}/edit`}
            className="flex items-center gap-4 px-4 py-3 transition hover:bg-surface2"
          >
            <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden bg-surface2">
              {p.image && (
                <Image src={p.image} alt={p.name} fill sizes="48px" className="object-contain" />
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm text-ivory">{p.name}</p>
              <p className="text-xs text-muted">
                {p.sku} · {p.category}
              </p>
            </div>
            <p className="whitespace-nowrap text-sm text-gold">{formatPrice(p.price)}</p>
          </Link>
        ))}

        {pageItems.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-muted">Không tìm thấy sản phẩm nào.</p>
        )}
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
            className="border border-line px-3 py-1 text-sm text-ivory disabled:opacity-40"
          >
            ← Trước
          </button>
          <span className="text-sm text-muted">
            {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
            className="border border-line px-3 py-1 text-sm text-ivory disabled:opacity-40"
          >
            Sau →
          </button>
        </div>
      )}
    </div>
  );
}
