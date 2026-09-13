import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { blogPosts, getBlogPost } from "@/data/blog";
import ProductGlyph from "@/components/ProductGlyph";
import JsonLd from "@/components/JsonLd";
import { site } from "@/lib/site";

export function generateStaticParams() {
  return blogPosts.map((p) => ({ slug: p.slug }));
}

export function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Metadata {
  const post = getBlogPost(params.slug);
  if (!post) return {};

  return {
    title: post.title,
    description: post.excerpt,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: "article",
      publishedTime: post.date,
      url: `${site.url}/blog/${post.slug}`,
    },
  };
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function BlogPostPage({
  params,
}: {
  params: { slug: string };
}) {
  const post = getBlogPost(params.slug);
  if (!post) return notFound();

  const related = blogPosts.filter((p) => p.slug !== post.slug).slice(0, 2);

  return (
    <div className="mx-auto max-w-3xl px-5 py-14">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: post.title,
          description: post.excerpt,
          datePublished: post.date,
          author: { "@type": "Organization", name: site.name },
          publisher: { "@type": "Organization", name: site.name },
          mainEntityOfPage: `${site.url}/blog/${post.slug}`,
        }}
      />

      <nav className="mb-8 text-xs text-muted">
        <Link href="/" className="hover:text-ivory">
          Trang chủ
        </Link>{" "}
        / <Link href="/blog" className="hover:text-ivory">Blog</Link> /{" "}
        <span className="text-ivory">{post.title}</span>
      </nav>

      <p className="text-xs uppercase tracking-wide text-gold">
        {post.category}
      </p>
      <h1 className="mt-2 font-serif text-3xl leading-snug text-ivory md:text-4xl">
        {post.title}
      </h1>
      <p className="mt-3 text-xs text-muted">
        {formatDate(post.date)} · {post.readTime}
      </p>

      <div className="my-10 flex aspect-[16/7] items-center justify-center bg-surface p-10">
        <ProductGlyph type={post.icon} className="max-h-28 max-w-28" />
      </div>

      <div className="flex flex-col gap-5">
        {post.content.map((para, i) => (
          <p key={i} className="leading-relaxed text-muted">
            {para}
          </p>
        ))}
      </div>

      {related.length > 0 && (
        <div className="mt-16 border-t border-line pt-10">
          <p className="mb-6 font-serif text-lg text-ivory">Bài viết liên quan</p>
          <div className="grid gap-6 sm:grid-cols-2">
            {related.map((r) => (
              <Link
                key={r.slug}
                href={`/blog/${r.slug}`}
                className="border border-line bg-surface p-5 transition hover:border-gold/50"
              >
                <p className="text-xs uppercase tracking-wide text-gold">
                  {r.category}
                </p>
                <p className="mt-2 font-serif text-base text-ivory">{r.title}</p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
