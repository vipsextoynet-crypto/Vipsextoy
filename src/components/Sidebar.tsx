import Link from "next/link";
import { Search } from "lucide-react";
import { categories } from "@/data/products";

export default function Sidebar({ activeSlug }: { activeSlug?: string }) {
  return (
    <aside className="w-full shrink-0 md:w-56">
      <form action="/shop" method="get" className="mb-4 flex border border-line">
        <input
          type="text"
          name="q"
          placeholder="Tìm kiếm"
          className="w-full bg-surface px-3 py-2 text-sm text-ivory outline-none"
        />
        <button
          type="submit"
          aria-label="Tìm kiếm"
          className="flex w-10 items-center justify-center bg-surface2 text-muted transition hover:text-gold"
        >
          <Search size={16} />
        </button>
      </form>

      <div className="border border-line bg-surface">
        <p className="bg-gold px-4 py-3 text-sm font-semibold tracking-wide text-white">
          Danh mục sản phẩm
        </p>
        <nav className="flex flex-col">
          {categories.map((c) => (
            <Link
              key={c.slug}
              href={`/danh-muc/${c.slug}`}
              className={`border-b border-line px-4 py-2.5 text-sm transition last:border-b-0 hover:bg-surface2 hover:text-gold ${
                c.slug === activeSlug ? "bg-surface2 text-gold" : "text-ivory"
              }`}
            >
              {c.name}
            </Link>
          ))}
        </nav>
      </div>
    </aside>
  );
}
