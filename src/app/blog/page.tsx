import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { blogPosts } from "@/data/blog";
import ProductGlyph from "@/components/ProductGlyph";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Góc chia sẻ của Vipextoy — hướng dẫn chọn mua, vệ sinh, bảo quản sản phẩm chăm sóc cá nhân và những câu chuyện chăm sóc bản thân.",
  alternates: { canonical: "/blog" },
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function BlogPage() {
  return (
    <div className="mx-auto max-w-6xl px-5 py-14">
      <div className="mb-12">
        <p className="text-xs uppercase tracking-wide text-gold">Blog</p>
        <h1 className="mt-2 font-serif text-3xl text-ivory">Góc chia sẻ</h1>
        <p className="mt-3 max-w-xl text-muted">
          Hướng dẫn chọn mua, vệ sinh và bảo quản sản phẩm, cùng những câu
          chuyện xoay quanh việc chăm sóc bản thân.
        </p>
      </div>

      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {blogPosts.map((post) => (
          <Link
            key={post.slug}
            href={`/blog/${post.slug}`}
            className="group flex flex-col border border-line bg-surface transition hover:border-gold/50"
          >
            <div className="relative flex aspect-[16/10] items-center justify-center overflow-hidden bg-surface2 p-10">
              {post.image ? (
                <Image
                  src={post.image}
                  alt={post.title}
                  fill
                  className="object-cover p-0"
                  sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                />
              ) : (
                <ProductGlyph type={post.icon} className="max-h-20 max-w-20" />
              )}
            </div>
            <div className="flex flex-1 flex-col gap-2 p-5">
              <div className="flex items-center justify-between text-xs text-muted">
                <span className="uppercase tracking-wide text-gold">
                  {post.category}
                </span>
                <span>{formatDate(post.date)}</span>
              </div>
              <h2 className="font-serif text-lg leading-snug text-ivory">
                {post.title}
              </h2>
              <p className="mt-1 line-clamp-3 text-sm text-muted">
                {post.excerpt}
              </p>
              <p className="mt-auto pt-3 text-xs text-muted">{post.readTime}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
