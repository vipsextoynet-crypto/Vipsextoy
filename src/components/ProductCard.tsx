"use client";

import Link from "next/link";
import Image from "next/image";
import { Product, formatPrice } from "@/data/products";
import ProductGlyph from "./ProductGlyph";
import { useCart } from "@/lib/cart-context";

export default function ProductCard({ product }: { product: Product }) {
  const { addItem } = useCart();

  return (
    <div className="group flex flex-col border border-line bg-surface transition hover:border-gold hover:shadow-md">
      <div className="flex flex-1 flex-col gap-1 p-3 pb-0">
        <Link href={`/product/${product.slug}`}>
          <h3 className="line-clamp-2 min-h-[2.6em] text-sm font-bold uppercase text-ivory transition group-hover:text-gold">
            {product.name}
          </h3>
        </Link>
      </div>

      <Link href={`/product/${product.slug}`} className="block">
        <div className="relative flex aspect-square items-center justify-center overflow-hidden bg-surface2 p-4">
          {product.badge && (
            <span className="absolute left-2 top-2 z-10 border border-gold/40 bg-surface px-2 py-1 text-[10px] font-medium tracking-wide text-gold">
              {product.badge}
            </span>
          )}
          {product.image ? (
            <Image
              src={product.image}
              alt={product.name}
              fill
              loading="lazy"
              sizes="(max-width: 640px) 45vw, (max-width: 1024px) 25vw, 220px"
              className="object-contain p-2 transition group-hover:scale-105"
            />
          ) : (
            <ProductGlyph type={product.icon} className="max-h-28 max-w-28" />
          )}
        </div>
      </Link>

      <div className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-semibold text-gold sm:text-[15px]">
            Giá: {formatPrice(product.price)}
          </span>
          {product.compareAt && (
            <span className="text-xs text-muted line-through">
              {formatPrice(product.compareAt)}
            </span>
          )}
        </div>
        <button
          onClick={() => addItem(product)}
          className="w-full shrink-0 rounded bg-blue px-3 py-1.5 text-xs font-semibold tracking-wide text-white transition hover:opacity-90 sm:w-auto"
        >
          Mua hàng
        </button>
      </div>
    </div>
  );
}
