"use client";

import Link from "next/link";
import { ShoppingBag, Menu, X, Home, ChevronDown, Search } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/cart-context";
import { categories, formatPrice } from "@/data/products";
import { site } from "@/lib/site";

export default function Header() {
  const { count, subtotal, openCart } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const [catOpen, setCatOpen] = useState(false);
  const [q, setQ] = useState("");
  const router = useRouter();

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    router.push(`/shop?q=${encodeURIComponent(q)}`);
  }

  return (
    <header className="sticky top-0 z-40">
      {/* Thanh trên: logo, tổng tiền giỏ hàng, tìm kiếm, hotline */}
      <div className="bg-ivory">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-3">
          <Link
            href="/"
            className="font-serif text-xl font-bold tracking-wide text-gold"
          >
            {site.name.toUpperCase()}.NET
          </Link>

          <button
            onClick={openCart}
            className="flex items-center gap-2 text-xs text-white sm:text-sm"
          >
            <span>
              THÀNH TIỀN: <span className="font-semibold">{formatPrice(subtotal)}</span>
            </span>
            <span className="relative flex h-6 w-6 items-center justify-center rounded-full bg-gold">
              <ShoppingBag size={13} className="text-white" />
              {count > 0 && (
                <span className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-white text-[9px] font-bold text-gold">
                  {count}
                </span>
              )}
            </span>
          </button>

          <form
            onSubmit={handleSearch}
            className="hidden min-w-[220px] flex-1 items-center border border-white/20 bg-white sm:flex sm:max-w-xs"
          >
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              type="text"
              placeholder="Tìm kiếm sản phẩm..."
              className="w-full bg-transparent px-3 py-2 text-sm text-ivory outline-none"
            />
            <button type="submit" aria-label="Tìm kiếm" className="px-3 text-muted hover:text-gold">
              <Search size={16} />
            </button>
          </form>

          <a href={site.phoneHref} className="text-xs sm:text-sm">
            <span className="font-semibold text-white">
              Liên hệ đặt hàng toàn quốc
            </span>{" "}
            <span className="font-bold text-gold">{site.phone}</span>
          </a>

          <button
            className="text-white lg:hidden"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Menu"
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Thanh menu hồng */}
      <div className="hidden bg-gold lg:block">
        <div className="mx-auto flex max-w-6xl items-center gap-1 px-5 text-sm font-medium uppercase tracking-wide text-white">
          <Link
            href="/"
            className="flex items-center gap-1.5 px-4 py-3 transition hover:bg-black/10"
          >
            <Home size={16} />
            Trang chủ
          </Link>

          <div
            className="group relative"
            onMouseEnter={() => setCatOpen(true)}
            onMouseLeave={() => setCatOpen(false)}
          >
            <button className="flex items-center gap-1 px-4 py-3 transition hover:bg-black/10">
              SẢN PHẨM
              <ChevronDown size={14} />
            </button>
            {catOpen && (
              <div className="absolute left-0 top-full w-[560px] border border-line bg-surface p-6 normal-case shadow-xl">
                <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                  {categories.map((c) => (
                    <Link key={c.slug} href={`/danh-muc/${c.slug}`} className="group/item">
                      <p className="text-sm text-ivory transition group-hover/item:text-gold">
                        {c.name}
                      </p>
                      <p className="mt-0.5 text-xs text-muted">{c.shortDescription}</p>
                    </Link>
                  ))}
                </div>
                <Link
                  href="/shop"
                  className="mt-5 block border-t border-line pt-4 text-xs text-gold hover:text-ivory"
                >
                  Xem toàn bộ sản phẩm →
                </Link>
              </div>
            )}
          </div>

          <Link href="/shop" className="px-4 py-3 transition hover:bg-black/10">
            Cửa hàng
          </Link>
          <Link href="/huong-dan-mua-hang" className="px-4 py-3 transition hover:bg-black/10">
            Hướng dẫn mua hàng
          </Link>
          <Link href="/blog" className="px-4 py-3 transition hover:bg-black/10">
            Blog
          </Link>
          <Link href="/lien-he" className="px-4 py-3 transition hover:bg-black/10">
            Liên hệ
          </Link>
        </div>
      </div>

      {menuOpen && (
        <div className="border-t border-line bg-surface px-5 py-4 lg:hidden">
          <form onSubmit={handleSearch} className="mb-4 flex border border-line">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              type="text"
              placeholder="Tìm kiếm sản phẩm..."
              className="w-full bg-surface px-3 py-2 text-sm text-ivory outline-none"
            />
            <button type="submit" aria-label="Tìm kiếm" className="px-3 text-muted">
              <Search size={16} />
            </button>
          </form>
          <nav className="flex flex-col gap-3 text-sm text-ivory">
            <Link href="/shop" onClick={() => setMenuOpen(false)}>
              Cửa hàng
            </Link>
            <Link href="/huong-dan-mua-hang" onClick={() => setMenuOpen(false)}>
              Hướng dẫn mua hàng
            </Link>
            <p className="mt-2 text-xs uppercase tracking-wide text-muted">Danh mục</p>
            {categories.map((c) => (
              <Link
                key={c.slug}
                href={`/danh-muc/${c.slug}`}
                onClick={() => setMenuOpen(false)}
                className="pl-2"
              >
                {c.name}
              </Link>
            ))}
            <Link href="/blog" onClick={() => setMenuOpen(false)} className="mt-2">
              Blog
            </Link>
            <Link href="/lien-he" onClick={() => setMenuOpen(false)}>
              Liên hệ
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
