"use client";

import { useRouter } from "next/navigation";
import ProductForm from "@/components/admin/ProductForm";

export default function NewProductPage() {
  const router = useRouter();

  return (
    <main className="mx-auto max-w-2xl px-5 py-14">
      <button
        onClick={() => router.push("/admin/products")}
        className="mb-6 text-sm text-muted hover:text-ivory"
      >
        ← Quay lại danh sách
      </button>

      <h1 className="mb-2 font-serif text-2xl text-ivory">Thêm sản phẩm mới</h1>
      <p className="mb-8 text-sm text-muted">
        Lưu xong website sẽ tự build lại và lên trang sau khoảng 1–2 phút.
      </p>

      <ProductForm mode="create" />
    </main>
  );
}
