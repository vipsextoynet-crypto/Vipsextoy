import Link from "next/link";
import { notFound } from "next/navigation";
import { blogPosts } from "@/data/blog";
import BlogForm from "@/components/admin/BlogForm";

export const dynamic = "force-dynamic";

export default async function EditBlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = blogPosts.find((p) => p.slug === slug);

  if (!post) return notFound();

  return (
    <main className="mx-auto max-w-2xl px-5 py-14">
      <Link href="/admin/blog" className="mb-6 inline-block text-sm text-muted hover:text-ivory">
        ← Quay lại danh sách
      </Link>

      <h1 className="mb-2 font-serif text-2xl text-ivory">Sửa bài viết</h1>
      <p className="mb-8 text-sm text-muted">{post.title}</p>

      <BlogForm mode="edit" initial={post} />
    </main>
  );
}
