import { BlogPost } from "@/data/blog";

function tsString(value: string): string {
  return JSON.stringify(value);
}

function tsContentArray(values: string[]): string {
  const lines = values.map((v) => `      ${tsString(v)},`);
  return `[\n${lines.join("\n")}\n    ]`;
}

// Chuyen 1 BlogPost thanh doan code TS y nhu cac object co san trong
// blog.ts, de chen vao file bang text (khong can parse/eval file).
export function blogPostToTs(p: BlogPost): string {
  const lines: string[] = [];
  lines.push("  {");
  lines.push(`    slug: ${tsString(p.slug)},`);
  lines.push(`    title: ${tsString(p.title)},`);
  lines.push(`    excerpt: ${tsString(p.excerpt)},`);
  lines.push(`    content: ${tsContentArray(p.content)},`);
  lines.push(`    date: ${tsString(p.date)},`);
  lines.push(`    readTime: ${tsString(p.readTime)},`);
  lines.push(`    category: ${tsString(p.category)},`);
  lines.push(`    icon: ${tsString(p.icon)},`);
  if (p.image) lines.push(`    image: ${tsString(p.image)},`);
  lines.push("  },");
  return lines.join("\n");
}

// Chen doan code 1 bai viet moi vao ngay truoc dau "];" ket thuc mang
// `blogPosts`, giu nguyen toan bo phan con lai cua file. Dung cung ky thuat
// nhu insertProductIntoSource: tim ham getBlogPost roi lui lai "];" gan nhat,
// khong phu thuoc LF/CRLF.
export function insertBlogPostIntoSource(source: string, postTs: string): string {
  const nl = source.includes("\r\n") ? "\r\n" : "\n";

  let idx = -1;
  const fnIdx = source.indexOf("export function getBlogPost");
  if (fnIdx !== -1) {
    idx = source.lastIndexOf("];", fnIdx);
  }
  if (idx === -1) {
    const m = [...source.matchAll(/^\];/gm)].pop();
    if (m && m.index !== undefined) idx = m.index;
  }

  if (idx === -1) {
    throw new Error("Không tìm thấy vị trí kết thúc mảng blogPosts trong file.");
  }

  const block = postTs.replace(/\r?\n/g, nl);
  return source.slice(0, idx) + block + nl + source.slice(idx);
}

function findBlogPostBlock(source: string, slug: string): { start: number; end: number } {
  const slugLine = `slug: ${JSON.stringify(slug)},`;
  const slugIdx = source.indexOf(slugLine);

  if (slugIdx === -1) {
    throw new Error(`Không tìm thấy bài viết với slug "${slug}".`);
  }

  const start = source.lastIndexOf("\n  {", slugIdx);
  const closeMarker = "\n  },";
  const closeIdx = source.indexOf(closeMarker, slugIdx);

  if (start === -1 || closeIdx === -1) {
    throw new Error(`Không xác định được ranh giới object cho bài viết "${slug}".`);
  }

  return { start: start + 1, end: closeIdx + closeMarker.length };
}

export function replaceBlogPostInSource(source: string, slug: string, postTs: string): string {
  const { start, end } = findBlogPostBlock(source, slug);
  return source.slice(0, start) + postTs.trimEnd() + source.slice(end);
}

export function removeBlogPostFromSource(source: string, slug: string): string {
  const { start, end } = findBlogPostBlock(source, slug);
  return source.slice(0, start) + source.slice(end);
}
