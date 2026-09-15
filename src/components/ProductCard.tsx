"use client";

import Link from "next/link";
import Image from "next/image";
import { Product, formatPrice } from "@/data/products";
import ProductGlyph from "./ProductGlyph";
import SensitiveOverlay from "./SensitiveOverlay";
import { useCart } from "@/lib/cart-context";

export default function ProductCard({ product }: { product: Product }) {
  const { addItem } = useCart();

  return (
    <div className="group flex flex-col border border-line bg-surface transition hover:border-gold/50 hover:shadow-md">
      <Link href={`/product/${product.slug}`} className="block">
        <div className="relative flex aspect-square items-center justify-center overflow-hidden bg-surface2 p-3 sm:p-6">
          {product.badge && (
            <span className="absolute left-1.5 top-1.5 z-10 border border-gold/40 bg-surface px-1.5 py-0.5 text-[9px] tracking-wide text-gold sm:left-2 sm:top-2 sm:px-2 sm:py-1 sm:text-[10px]">
              {product.badge}
            </span>
          )}
          {product.image ? (
            <SensitiveOverlay active={!!product.sensitive}>
              <Image
                src={product.image}
                alt={product.name}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                className="object-contain p-1 transition group-hover:scale-105 sm:p-2"
                loading="lazy"
              />
            </SensitiveOverlay>
          ) : (
            <ProductGlyph type={product.icon} className="max-h-16 max-w-16 sm:max-h-28 sm:max-w-28" />
          )}
        </div>
      </Link>
      <div className="flex flex-1 flex-col gap-1.5 p-2.5 sm:gap-2 sm:p-4">
        <Link href={`/product/${product.slug}`}>
          <h3 className="line-clamp-2 min-h-[2.2em] text-xs text-ivory transition group-hover:text-gold sm:min-h-[2.6em] sm:text-sm">
            {product.name}
          </h3>
        </Link>
        <div className="mt-auto flex flex-col gap-1.5 pt-1 sm:gap-2 sm:pt-2">
          <div className="flex flex-wrap items-baseline gap-1 sm:gap-2">
            <span className="text-xs text-muted sm:text-sm">Giá:</span>
            <span className="text-sm font-semibold text-gold sm:text-base">
              {formatPrice(product.price)}
            </span>
            {product.compareAt && (
              <span className="text-[10px] text-muted line-through sm:text-xs">
                {formatPrice(product.compareAt)}
              </span>
            )}
          </div>
          <button
            onClick={() => addItem(product)}
            className="w-full bg-cta py-1.5 text-xs font-medium tracking-wide text-white transition hover:opacity-90 sm:py-2 sm:text-sm"
          >
            Mua hàng
          </button>
        </div>
      </div>
    </div>
  );
}
