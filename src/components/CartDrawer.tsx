"use client";

import Link from "next/link";
import Image from "next/image";
import { X, Minus, Plus, Trash2 } from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { formatPrice } from "@/data/products";
import ProductGlyph from "./ProductGlyph";

export default function CartDrawer() {
  const { items, isOpen, closeCart, setQty, removeItem, subtotal } = useCart();

  return (
    <>
      <div
        onClick={closeCart}
        className={`fixed inset-0 z-40 bg-black/60 transition-opacity ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <aside
        className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-line bg-background transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-line px-6 py-5">
          <p className="font-serif text-lg text-ivory">Giỏ hàng của bạn</p>
          <button onClick={closeCart} aria-label="Đóng giỏ hàng" className="text-muted hover:text-ivory">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {items.length === 0 ? (
            <p className="mt-10 text-center text-sm text-muted">
              Giỏ hàng đang trống.
            </p>
          ) : (
            <ul className="flex flex-col gap-5">
              {items.map((item) => (
                <li key={item.slug} className="flex gap-4">
                  <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden bg-surface2 p-3">
                    {item.image ? (
                      <Image
                        src={item.image}
                        alt={item.name}
                        fill
                        sizes="64px"
                        className="object-contain p-1.5"
                      />
                    ) : (
                      <ProductGlyph type={item.icon} />
                    )}
                  </div>
                  <div className="flex flex-1 flex-col">
                    <p className="text-sm text-ivory">{item.name}</p>
                    <p className="text-sm text-gold">{formatPrice(item.price)}</p>
                    <div className="mt-2 flex items-center gap-3">
                      <button
                        onClick={() => setQty(item.slug, item.qty - 1)}
                        className="flex h-7 w-7 items-center justify-center border border-line text-ivory hover:border-gold"
                      >
                        <Minus size={12} />
                      </button>
                      <span className="w-4 text-center text-sm text-ivory">
                        {item.qty}
                      </span>
                      <button
                        onClick={() => setQty(item.slug, item.qty + 1)}
                        className="flex h-7 w-7 items-center justify-center border border-line text-ivory hover:border-gold"
                      >
                        <Plus size={12} />
                      </button>
                      <button
                        onClick={() => removeItem(item.slug)}
                        aria-label="Xoá"
                        className="ml-auto text-muted hover:text-rose"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t border-line px-6 py-5">
            <div className="mb-4 flex items-center justify-between text-sm">
              <span className="text-muted">Tạm tính</span>
              <span className="text-ivory">{formatPrice(subtotal)}</span>
            </div>
            <Link
              href="/checkout"
              onClick={closeCart}
              className="block w-full bg-gold py-3 text-center text-sm tracking-wide text-background transition hover:bg-ivory"
            >
              Tiến hành thanh toán
            </Link>
          </div>
        )}
      </aside>
    </>
  );
}
