"use client";

import Link from "next/link";
import { ShoppingBag, Menu, X, ChevronDown, Home, Search } from "lucide-react";
import { useState } from "react";
import { useCart } from "@/lib/cart-context";
import { categories, formatPrice } from "@/data/products";
import { site } from "@/lib/site";

export default function Header() {
  const { count, subtotal, openCart } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const [catOpen, setCatOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40">
      {/* Thanh tren cung: logo, thanh tien, hotline - nen den, giong vipsextoy.net */}
      <div className="bg-ink text-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-3">
          <Link href="/" className="font-serif text-xl font-bold tracking-wide text-gold">
            {site.name.toUpperCase()}<span className="text-white">.NET</span>
          </Link>

          <button
            onClick={openCart}
            className="flex items-center gap-2 text-xs sm:text-sm"
          >
            <span>
              THÀNH TIỀN: <span className="text-white">{formatPrice(subtotal)}</span>
            </span>
            <span className="relative flex h-6 w-6 items-center justify-center rounded-full bg-gold">
              <ShoppingBag size={13} strokeWidth={1.8} />
              {count > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red text-[10px] font-bold">
                  {count}
                </span>
              )}
            </span>
          </button>

          <form
            action="/shop"
            className="order-last flex w-full border border-white/15 bg-white/5 sm:order-none sm:w-56 md:w-64"
          >
            <input
              type="text"
              name="q"
              placeholder="Tìm kiếm sản phẩm..."
              aria-label="Tìm kiếm sản phẩm"
              className="w-full bg-transparent px-3 py-1.5 text-xs text-white placeholder:text-white/50 outline-none sm:text-sm"
            />
            <button
              type="submit"
              aria-label="Tìm kiếm"
              className="flex items-center justify-center px-3 text-white/70 transition hover:text-gold"
            >
              <Search size={16} />
            </button>
          </form>

          <a href={site.phoneHref} className="flex flex-col items-end text-xs font-medium leading-tight tracking-wide sm:text-sm">
            <span className="text-red">Liên hệ đặt hàng toàn quốc</span>
            <span className="text-base font-bold text-yellow">{site.phone} (Bảo)</span>
          </a>
        </div>
      </div>

      {/* Thanh menu: nen hong thuong hieu */}
      <div className="bg-gold">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5">
          <nav className="hidden w-full items-center justify-between text-sm font-semibold uppercase tracking-wide text-white md:flex">
            <Link
              href="/"
              className="flex items-center gap-1.5 py-3 transition hover:text-ink"
            >
              <Home size={15} />
              Trang chủ
            </Link>
            <div
              className="group relative"
              onMouseEnter={() => setCatOpen(true)}
              onMouseLeave={() => setCatOpen(false)}
            >
              <button className="flex items-center gap-1 py-3 transition hover:text-ink">
                Sản phẩm
                <ChevronDown size={14} />
              </button>
              {catOpen && (
                <div className="absolute left-0 top-full w-[560px] border border-line bg-surface p-6 normal-case shadow-xl">
                  <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                    {categories.map((c) => (
                      <Link key={c.slug} href={`/danh-muc/${c.slug}`} className="group/item">
                        <p className="text-sm font-medium text-ivory transition group-hover/item:text-gold">
                          {c.name}
                        </p>
                        <p className="mt-0.5 text-xs font-normal text-muted">
                          {c.shortDescription}
                        </p>
                      </Link>
                    ))}
                  </div>
                  <Link
                    href="/shop"
                    className="mt-5 block border-t border-line pt-4 text-xs font-medium text-gold hover:text-ink"
                  >
                    Xem toàn bộ sản phẩm →
                  </Link>
                </div>
              )}
            </div>
            <Link href="/shop" className="py-3 transition hover:text-ink">
              Cửa hàng
            </Link>
            <Link href="/huong-dan-mua-hang" className="py-3 transition hover:text-ink">
              Hướng dẫn mua hàng
            </Link>
            <Link href="/blog" className="py-3 transition hover:text-ink">
              Blog
            </Link>
            <Link href="/lien-he" className="py-3 transition hover:text-ink">
              Liên hệ
            </Link>
          </nav>

          <button
            className="ml-auto py-3 text-white md:hidden"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Menu"
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {menuOpen && (
          <div className="border-t border-white/20 px-5 py-4 md:hidden">
            <nav className="flex flex-col gap-3 text-sm font-medium text-white">
              <Link href="/" onClick={() => setMenuOpen(false)}>
                Trang chủ
              </Link>
              <Link href="/shop" onClick={() => setMenuOpen(false)}>
                Cửa hàng
              </Link>
              <p className="mt-2 text-xs uppercase tracking-wide text-white/70">
                Danh mục
              </p>
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
              <Link href="/huong-dan-mua-hang" onClick={() => setMenuOpen(false)}>
                Hướng dẫn mua hàng
              </Link>
              <Link href="/blog" onClick={() => setMenuOpen(false)} className="mt-2">
                Blog
              </Link>
              <Link href="/lien-he" onClick={() => setMenuOpen(false)}>
                Liên hệ
              </Link>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
