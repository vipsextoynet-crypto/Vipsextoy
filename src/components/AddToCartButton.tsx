"use client";

import { useState } from "react";
import { Product } from "@/data/products";
import { useCart } from "@/lib/cart-context";
import { Minus, Plus } from "lucide-react";

export default function AddToCartButton({ product }: { product: Product }) {
  const [qty, setQty] = useState(1);
  const { addItem } = useCart();

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center border border-line">
        <button
          onClick={() => setQty((q) => Math.max(1, q - 1))}
          className="flex h-11 w-11 items-center justify-center text-ivory hover:text-gold"
          aria-label="Giảm số lượng"
        >
          <Minus size={14} />
        </button>
        <span className="w-8 text-center text-ivory">{qty}</span>
        <button
          onClick={() => setQty((q) => q + 1)}
          className="flex h-11 w-11 items-center justify-center text-ivory hover:text-gold"
          aria-label="Tăng số lượng"
        >
          <Plus size={14} />
        </button>
      </div>
      <button
        onClick={() => addItem(product, qty)}
        className="flex-1 bg-gold py-3 text-sm tracking-wide text-background transition hover:bg-ivory"
      >
        Thêm vào giỏ hàng
      </button>
    </div>
  );
}
