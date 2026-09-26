"use client";

import { useRouter } from "next/navigation";
import BlogForm from "@/components/admin/BlogForm";

export default function NewBlogPostPage() {
  const router = useRouter();

  return (
    <main className="mx-auto max-w-2xl px-5 py-14">
      <button
        onClick={() => router.push("/admin/blog")}
        className="mb-6 text-sm text-muted hover:text-ivory"
      >
        ← Quay lại danh sách
      </button>

      <h1 className="mb-2 font-serif text-2xl text-ivory">Thêm bài viết mới</h1>
      <p className="mb-8 text-sm text-muted">
        Lưu xong website sẽ tự build lại và lên trang sau khoảng 1–2 phút (sau khi bấm
        "Cập nhật lên web" ở trang quản trị).
      </p>

      <BlogForm mode="create" />
    </main>
  );
}
