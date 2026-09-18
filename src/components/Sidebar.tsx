import Link from "next/link";
import { categories } from "@/data/products";

export default function Sidebar({ activeSlug }: { activeSlug?: string }) {
  return (
    <aside className="w-full shrink-0 md:w-56">
      <div className="border border-line bg-surface">
        <p className="bg-gold px-4 py-2.5 text-sm font-semibold tracking-wide text-white">
          Danh mục sản phẩm
        </p>
        <nav className="grid grid-cols-2 gap-2 p-2.5 md:flex md:grid-cols-1 md:flex-col md:gap-0 md:p-0">
          {categories.map((c) => (
            <Link
              key={c.slug}
              href={`/danh-muc/${c.slug}`}
              className={`border border-line px-2.5 py-2 text-center text-xs leading-snug transition hover:border-gold hover:bg-surface2 hover:text-gold md:border-x-0 md:border-b md:border-t-0 md:px-4 md:py-2.5 md:text-left md:text-sm md:last:border-b-0 md:hover:border-none ${
                c.slug === activeSlug ? "border-gold bg-surface2 text-gold" : "text-ivory"
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
