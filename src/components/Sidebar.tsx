import Link from "next/link";
import { getGroups } from "@/lib/groups";

export default function Sidebar({ activeSlug }: { activeSlug?: string }) {
  const groups = getGroups();

  return (
    <aside className="w-full shrink-0 md:w-56">
      <div className="border border-line bg-surface">
        <p className="bg-gold px-4 py-2.5 text-sm font-semibold tracking-wide text-white">
          Danh mục sản phẩm
        </p>
        <nav className="flex flex-col">
          {groups.map((g) => {
            // Nhóm chỉ có 1 danh mục con: bỏ dòng con, thanh nhóm bấm thẳng
            // vào danh mục đó (tránh trùng nội dung với trang /nhom).
            const single = g.items.length === 1;
            const href = single
              ? `/danh-muc/${g.items[0].slug}`
              : `/nhom/${g.slug}`;
            return (
              <div key={g.slug}>
                <Link
                  href={href}
                  className="block border-b border-line border-l-4 border-l-gold bg-gold/10 px-3 py-2 text-xs font-bold uppercase tracking-wide text-gold-dark transition hover:bg-gold/20"
                >
                  {g.name}
                </Link>
                {!single &&
                  g.items.map((c) => (
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
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
