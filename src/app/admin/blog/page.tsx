import Link from "next/link";
import { blogPosts } from "@/data/blog";
import BlogListClient from "@/components/admin/BlogListClient";
import PublishButton from "@/components/admin/PublishButton";

export const dynamic = "force-dynamic";

export default function AdminBlogPage() {
  const list = blogPosts.map((p) => ({
    slug: p.slug,
    title: p.title,
    category: p.category,
    date: p.date,
  }));

  return (
    <main className="mx-auto max-w-4xl px-5 py-14">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link href="/admin" className="text-sm text-muted hover:text-ivory">
          ← Quay lại
        </Link>
        <Link
          href="/admin/blog/new"
          className="bg-cta px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
        >
          + Thêm bài viết
        </Link>
      </div>

      <div className="mb-6 border border-line bg-surface p-4">
        <PublishButton />
      </div>

      <h1 className="mb-1 font-serif text-2xl text-ivory">Bài viết Blog</h1>
      <p className="mb-6 text-sm text-muted">{list.length} bài viết — bấm vào 1 bài để sửa.</p>

      <BlogListClient posts={list} />
    </main>
  );
}
