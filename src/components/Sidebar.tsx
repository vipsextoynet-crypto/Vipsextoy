import Link from "next/link";
import { categories, groupCategories } from "@/data/products";

export default function Sidebar({ activeSlug }: { activeSlug?: string }) {
  const grouped = groupCategories(categories);

  return (
    <aside className="w-full shrink-0 md:w-56">
      <div className="border border-line bg-surface">
        <p className="bg-gold px-4 py-2.5 text-sm font-semibold tracking-wide text-white">
          Danh mục sản phẩm
        </p>
        <nav className="flex flex-col">
          {grouped.map(({ group, items }) => (
            <div key={group}>
              <p className="bg-rose/90 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white">
                {group}
              </p>
              {items.map((c) => (
                <Link
                  key={c.slug}
                  href={`/danh-muc/${c.slug}`}
                  className={`block border-b border-line px-4 py-2.5 text-sm transition hover:bg-surface2 hover:text-gold ${
                    c.slug === activeSlug ? "bg-surface2 text-gold" : "text-ivory"
                  }`}
                >
                  {c.name}
                </Link>
              ))}
            </div>
          ))}
        </nav>
      </div>
    </aside>
  );
}
