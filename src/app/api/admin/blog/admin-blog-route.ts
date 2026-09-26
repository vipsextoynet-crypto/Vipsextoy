import { NextRequest, NextResponse } from "next/server";
import { BlogPost, blogPosts } from "@/data/blog";
import { getFile, commitFile } from "@/lib/github-commit";
import { slugify } from "@/lib/product-serialize";
import { blogPostToTs, insertBlogPostIntoSource } from "@/lib/blog-serialize";

const BLOG_PATH = "src/data/blog.ts";
const ICONS = ["wave", "orb", "petal", "spark", "curve", "drop", "ring", "bloom"] as const;

function estimateReadTime(content: string[]): string {
  const words = content.join(" ").trim().split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.round(words / 200));
  return `${minutes} phút đọc`;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);

  if (!body) {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ." }, { status: 400 });
  }

  const { title, excerpt, content, category, icon, image, date } = body;

  if (!title || !excerpt || !Array.isArray(content) || content.length === 0 || !category) {
    return NextResponse.json(
      { error: "Vui lòng điền đầy đủ: tiêu đề, mô tả ngắn, nội dung, danh mục." },
      { status: 400 }
    );
  }

  const baseSlug = slugify(title);
  let slug = baseSlug;
  let n = 2;
  while (blogPosts.some((p) => p.slug === slug)) {
    slug = `${baseSlug}-${n}`;
    n++;
  }

  const post: BlogPost = {
    slug,
    title,
    excerpt,
    content,
    date: date || new Date().toISOString().slice(0, 10),
    readTime: estimateReadTime(content),
    category,
    icon: ICONS.includes(icon) ? icon : "wave",
    ...(image ? { image } : {}),
  };

  try {
    const { content: source, sha } = await getFile(BLOG_PATH);
    const newContent = insertBlogPostIntoSource(source, blogPostToTs(post));

    await commitFile(
      BLOG_PATH,
      newContent,
      sha,
      `feat: them bai viet "${title}" tu trang admin`
    );
  } catch (err) {
    return NextResponse.json(
      {
        error:
          "Không lưu được lên GitHub. Kiểm tra lại GITHUB_TOKEN / GITHUB_REPO / GITHUB_BRANCH trong Vercel Settings. Chi tiết: " +
          (err instanceof Error ? err.message : String(err)),
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, slug });
}
