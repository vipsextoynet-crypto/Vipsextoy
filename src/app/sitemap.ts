import type { MetadataRoute } from "next";
import { products, categories } from "@/data/products";
import { blogPosts } from "@/data/blog";
import { site } from "@/lib/site";

// Chi khai bao lastModified khi biet NGAY THAT. Truoc day dung new Date()
// cho moi trang -> moi lan build deu "vua doi", Google se dan bo qua tin hieu
// nay. changeFrequency / priority Google khong dung nen bo luon.
export default function sitemap(): MetadataRoute.Sitemap {
  // Ngay bai blog moi nhat -> dung lam lastModified cho trang danh sach /blog.
  const latestPostDate = blogPosts.reduce(
    (max, p) => (p.date > max ? p.date : max),
    ""
  );

  const staticPaths = [
    "",
    "/shop",
    "/blog",
    "/lien-he",
    "/gioi-thieu",
    "/chinh-sach/van-chuyen",
    "/chinh-sach/doi-tra",
    "/chinh-sach/thanh-toan",
    "/chinh-sach/bao-mat",
    "/chinh-sach/dieu-khoan",
  ];

  const staticRoutes: MetadataRoute.Sitemap = staticPaths.map((path) => ({
    url: `${site.url}${path}`,
    ...(path === "/blog" && latestPostDate
      ? { lastModified: new Date(latestPostDate) }
      : {}),
  }));

  const categoryRoutes: MetadataRoute.Sitemap = categories.map((c) => ({
    url: `${site.url}/danh-muc/${c.slug}`,
  }));

  const productRoutes: MetadataRoute.Sitemap = products.map((p) => ({
    url: `${site.url}/${p.slug}`,
  }));

  const blogRoutes: MetadataRoute.Sitemap = blogPosts.map((p) => ({
    url: `${site.url}/blog/${p.slug}`,
    lastModified: new Date(p.date),
  }));

  return [...staticRoutes, ...categoryRoutes, ...productRoutes, ...blogRoutes];
}
