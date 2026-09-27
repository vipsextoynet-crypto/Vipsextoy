import { NextRequest, NextResponse } from "next/server";
import { getFile, commitFile } from "@/lib/github-commit";
import {
  blogPostToTs,
  replaceBlogPostInSource,
  removeBlogPostFromSource,
} from "@/lib/blog-serialize";
import { BlogPost } from "@/data/blog";
import { normalizeBlogImageInput } from "@/lib/blog-image";

const BLOG_PATH = "src/data/blog.ts";
const ICONS = ["wave", "orb", "petal", "spark", "curve", "drop", "ring", "bloom"] as const;

function estimateReadTime(content: string[]): string {
  const words = content.join(" ").trim().split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.round(words / 200));
  return `${minutes} phút đọc`;
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const body = await req.json().catch(() => null);

    if (!body) {
      return NextResponse.json({ error: "Dữ liệu không hợp lệ." }, { status: 400 });
    }

    const { title, excerpt, content, category, icon, image, date, readTime } = body;

    if (!title || !excerpt || !Array.isArray(content) || content.length === 0 || !category) {
      return NextResponse.json(
        { error: "Vui lòng điền đầy đủ: tiêu đề, mô tả ngắn, nội dung, danh mục." },
        { status: 400 }
      );
    }

    const normalizedImage = normalizeBlogImageInput(image);

    const post: BlogPost = {
      slug,
      title,
      excerpt,
      content,
      date: date || new Date().toISOString().slice(0, 10),
      readTime: readTime || estimateReadTime(content),
      category,
      icon: (ICONS as readonly string[]).includes(icon) ? icon : "wave",
      ...(normalizedImage ? { image: normalizedImage } : {}),
    };

    const { content: source, sha } = await getFile(BLOG_PATH);
    const newContent = replaceBlogPostInSource(source, slug, blogPostToTs(post));

    await commitFile(
      BLOG_PATH,
      newContent,
      sha,
      `feat: sua bai viet "${title}" tu trang admin`
    );

    return NextResponse.json({ ok: true, slug });
  } catch (err) {
    console.error("[admin/blog PUT] Lỗi:", err);
    return NextResponse.json(
      {
        error:
          "Không lưu được bài viết. Chi tiết: " +
          (err instanceof Error ? err.message : String(err)),
      },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const { content: source, sha } = await getFile(BLOG_PATH);
    const newContent = removeBlogPostFromSource(source, slug);

    await commitFile(BLOG_PATH, newContent, sha, `feat: xoa bai viet "${slug}" tu trang admin`);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[admin/blog DELETE] Lỗi:", err);
    return NextResponse.json(
      {
        error:
          "Không xoá được bài viết. Chi tiết: " +
          (err instanceof Error ? err.message : String(err)),
      },
      { status: 500 }
    );
  }
}
