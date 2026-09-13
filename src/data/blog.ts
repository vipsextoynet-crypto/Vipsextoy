import posts from "./blog-posts.json";

export type BlogPost = {
  slug: string;
  title: string;
  excerpt: string;
  content: string[];
  date: string;
  readTime: string;
  category: string;
  icon: "wave" | "orb" | "petal" | "spark" | "curve" | "drop" | "ring" | "bloom";
  image?: string;
};

// Du lieu bai viet nam trong blog-posts.json (khong con hard-code trong file
// .ts nay) de script tu dong (xem scripts/generate-daily-post.mjs va workflow
// .github/workflows/daily-seo-post.yml) co the doc/ghi bang JSON.parse/stringify
// don gian, khong can sua code TypeScript moi khi dang bai moi.
export const blogPosts: BlogPost[] = (posts as BlogPost[]).sort(
  (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
);

export function getBlogPost(slug: string) {
  return blogPosts.find((p) => p.slug === slug);
}
