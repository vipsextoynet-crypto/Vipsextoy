"use client";

import Link from "next/link";
import Image from "next/image";
import { Product, formatPrice } from "@/data/products";
import ProductGlyph from "./ProductGlyph";
import { useCart } from "@/lib/cart-context";

export default function ProductCard({ product }: { product: Product }) {
  const { addItem } = useCart();

  return (
    <div className="group flex flex-col border border-line bg-surface transition hover:border-gold/50 hover:shadow-md">
      <Link href={`/product/${product.slug}`} className="block">
        <div className="relative flex aspect-square items-center justify-center overflow-hidden bg-surface2 p-6">
          {product.badge && (
            <span className="absolute left-2 top-2 z-10 border border-gold/40 bg-surface px-2 py-1 text-[10px] tracking-wide text-gold">
              {product.badge}
            </span>
          )}
          {product.image ? (
            <Image
              src={product.image}
              alt={product.name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-contain p-2 transition group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <ProductGlyph type={product.icon} className="max-h-28 max-w-28" />
          )}
        </div>
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <Link href={`/product/${product.slug}`}>
          <h3 className="line-clamp-2 min-h-[2.6em] text-sm text-ivory transition group-hover:text-gold">
            {product.name}
          </h3>
        </Link>
        <div className="mt-auto flex flex-col gap-2 pt-2">
          <div className="flex items-baseline gap-2">
            <span className="text-sm text-muted">Giá:</span>
            <span className="text-base font-semibold text-gold">
              {formatPrice(product.price)}
            </span>
            {product.compareAt && (
              <span className="text-xs text-muted line-through">
                {formatPrice(product.compareAt)}
              </span>
            )}
          </div>
          <button
            onClick={() => addItem(product)}
            className="w-full bg-cta py-2 text-sm font-medium tracking-wide text-white transition hover:opacity-90"
          >
            Mua hàng
          </button>
        </div>
      </div>
    </div>
  );
}
