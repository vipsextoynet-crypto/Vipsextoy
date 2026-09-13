"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from "react";
import { Product } from "@/data/products";

export type CartItem = {
  slug: string;
  name: string;
  price: number;
  qty: number;
  icon: Product["icon"];
  image?: string;
};

type CartContextType = {
  items: CartItem[];
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  addItem: (p: Product, qty?: number) => void;
  removeItem: (slug: string) => void;
  setQty: (slug: string, qty: number) => void;
  clear: () => void;
  count: number;
  subtotal: number;
};

const CartContext = createContext<CartContextType | null>(null);
const STORAGE_KEY = "vipextoy_cart_v1";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, hydrated]);

  function addItem(p: Product, qty = 1) {
    setItems((prev) => {
      const existing = prev.find((i) => i.slug === p.slug);
      if (existing) {
        return prev.map((i) =>
          i.slug === p.slug ? { ...i, qty: i.qty + qty } : i
        );
      }
      return [
        ...prev,
        {
          slug: p.slug,
          name: p.name,
          price: p.price,
          qty,
          icon: p.icon,
          image: p.image,
        },
      ];
    });
    setIsOpen(true);
  }

  function removeItem(slug: string) {
    setItems((prev) => prev.filter((i) => i.slug !== slug));
  }

  function setQty(slug: string, qty: number) {
    if (qty < 1) return removeItem(slug);
    setItems((prev) => prev.map((i) => (i.slug === slug ? { ...i, qty } : i)));
  }

  function clear() {
    setItems([]);
  }

  const count = useMemo(() => items.reduce((a, i) => a + i.qty, 0), [items]);
  const subtotal = useMemo(
    () => items.reduce((a, i) => a + i.qty * i.price, 0),
    [items]
  );

  return (
    <CartContext.Provider
      value={{
        items,
        isOpen,
        openCart: () => setIsOpen(true),
        closeCart: () => setIsOpen(false),
        addItem,
        removeItem,
        setQty,
        clear,
        count,
        subtotal,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
