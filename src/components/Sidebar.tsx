"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { categories } from "@/data/products";

export default function Sidebar({ activeSlug }: { activeSlug?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <aside className="w-full shrink-0 md:sticky md:top-[112px] md:w-64 md:self-start">
      <div className="border border-line bg-surface">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex w-full items-center justify-between bg-gold px-4 py-3 text-sm font-bold uppercase tracking-wide text-white md:pointer-events-none"
        >
          Danh mục sản phẩm
          <ChevronDown
            size={16}
            className={`transition-transform md:hidden ${open ? "rotate-180" : ""}`}
          />
        </button>
        <nav className={`flex-col ${open ? "flex" : "hidden"} md:flex`}>
          {categories.map((c) => (
            <Link
              key={c.slug}
              href={`/danh-muc/${c.slug}`}
              className={`border-b border-line px-4 py-2.5 text-sm transition last:border-b-0 hover:bg-surface2 hover:text-gold ${
                c.slug === activeSlug ? "bg-surface2 font-medium text-gold" : "text-ivory"
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
