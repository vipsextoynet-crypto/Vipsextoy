"use client";

import { useState } from "react";
import Image from "next/image";
import ProductGlyph from "./ProductGlyph";
import type { Product } from "@/data/products";

/**
 * Anh o trang chi tiet san pham.
 * - Khong co anh: hien icon minh hoa (glyph) nhu cu.
 * - 1 anh: hien anh chinh, KHONG co dai thumbnail (tranh thua giao dien).
 * - >= 2 anh (tu product.images): anh chinh + dai thumbnail phia duoi,
 *   bam vao thumbnail de doi anh chinh.
 *
 * Khung anh chinh co gioi han chieu rong (max-w-md) thay vi keo day het
 * chieu rong cot luoi nhu truoc - dung y "cho o san pham chinh nho lai".
 */
export default function ProductGallery({
  images,
  fallbackImage,
  icon,
  name,
}: {
  images?: string[];
  fallbackImage?: string;
  icon: Product["icon"];
  name: string;
}) {
  const gallery = images && images.length > 0 ? images : fallbackImage ? [fallbackImage] : [];
  const [active, setActive] = useState(0);

  if (gallery.length === 0) {
    return (
      <div className="mx-auto flex aspect-square w-full max-w-md items-center justify-center overflow-hidden bg-surface p-12 md:mx-0">
        <ProductGlyph type={icon} />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-md md:mx-0">
      <div className="relative flex aspect-square w-full items-center justify-center overflow-hidden bg-surface p-8">
        <Image
          key={gallery[active]}
          src={gallery[active]}
          alt={name}
          fill
          priority
          sizes="(max-width: 768px) 90vw, 420px"
          className="object-contain p-4"
        />
      </div>

      {gallery.length > 1 && (
        <div className="mt-3 grid grid-cols-4 gap-2">
          {gallery.map((src, i) => (
            <button
              key={src}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`Xem ảnh ${i + 1}`}
              className={`relative aspect-square overflow-hidden bg-surface2 transition ${
                i === active ? "ring-2 ring-gold" : "opacity-70 hover:opacity-100"
              }`}
            >
              <Image src={src} alt="" fill sizes="100px" className="object-contain p-1" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
