"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

// O tim kiem dat ngay tren trang chu (thay cho khoi tieu de + doan gioi thieu).
// Dung chung cach tim voi o tim kiem tren header: chuyen sang /shop?q=...
export default function HomeSearch() {
  const [q, setQ] = useState("");
  const router = useRouter();

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const term = q.trim();
    router.push(term ? `/shop?q=${encodeURIComponent(term)}` : "/shop");
  }

  return (
    <form
      onSubmit={handleSearch}
      role="search"
      className="mx-auto flex w-full max-w-2xl items-center border border-line bg-surface2"
    >
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        type="search"
        enterKeyHint="search"
        placeholder="Tìm kiếm sản phẩm..."
        aria-label="Tìm kiếm sản phẩm"
        className="w-full bg-transparent px-4 py-3 text-base text-ivory outline-none"
      />
      <button
        type="submit"
        aria-label="Tìm kiếm"
        className="flex h-full items-center bg-gold px-5 py-3 text-white transition hover:opacity-90"
      >
        <Search size={18} />
      </button>
    </form>
  );
}
