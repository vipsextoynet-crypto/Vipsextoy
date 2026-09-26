import { NextRequest, NextResponse } from "next/server";
import { getFile, commitFile } from "@/lib/github-commit";
import {
  blogPostToTs,
  replaceBlogPostInSource,
  removeBlogPostFromSource,
} from "@/lib/blog-serialize";
import { BlogPost } from "@/data/blog";

const BLOG_PATH = "src/data/blog.ts";
const ICONS = ["wave", "orb", "petal", "spark", "curve", "drop", "ring", "bloom"] as const;

function estimateReadTime(content: string[]): string {
  const words = content.join(" ").trim().split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.round(words / 200));
  return `${minutes} phút đọc`;
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
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

  const post: BlogPost = {
    slug,
    title,
    excerpt,
    content,
    date: date || new Date().toISOString().slice(0, 10),
    readTime: readTime || estimateReadTime(content),
    category,
    icon: ICONS.includes(icon) ? icon : "wave",
    ...(image ? { image } : {}),
  };

  try {
    const { content: source, sha } = await getFile(BLOG_PATH);
    const newContent = replaceBlogPostInSource(source, slug, blogPostToTs(post));

    await commitFile(
      BLOG_PATH,
      newContent,
      sha,
      `feat: sua bai viet "${title}" tu trang admin`
    );
  } catch (err) {
    return NextResponse.json(
      {
        error:
          "Không lưu được lên GitHub. Chi tiết: " +
          (err instanceof Error ? err.message : String(err)),
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, slug });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  try {
    const { content: source, sha } = await getFile(BLOG_PATH);
    const newContent = removeBlogPostFromSource(source, slug);

    await commitFile(BLOG_PATH, newContent, sha, `feat: xoa bai viet "${slug}" tu trang admin`);
  } catch (err) {
    return NextResponse.json(
      {
        error:
          "Không xoá được trên GitHub. Chi tiết: " +
          (err instanceof Error ? err.message : String(err)),
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
