import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { categories, getCategory, getProductsByCategory } from "@/data/products";
import ProductCard from "@/components/ProductCard";
import Sidebar from "@/components/Sidebar";
import Pagination from "@/components/Pagination";
import JsonLd from "@/components/JsonLd";
import { site } from "@/lib/site";

const PAGE_SIZE = 24;

export function generateStaticParams() {
  return categories.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const category = getCategory(slug);
  if (!category) return {};

  return {
    title: category.name,
    description: category.seoDescription,
    alternates: { canonical: `/danh-muc/${category.slug}` },
    openGraph: {
      title: `${category.name} | ${site.name}`,
      description: category.seoDescription,
      url: `${site.url}/danh-muc/${category.slug}`,
    },
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { slug } = await params;
  const { page: pageParam } = await searchParams;
  const category = getCategory(slug);
  if (!category) return notFound();

  const all = getProductsByCategory(category.slug);
  const totalPages = Math.max(1, Math.ceil(all.length / PAGE_SIZE));
  const page = Math.min(
    totalPages,
    Math.max(1, parseInt(pageParam ?? "1", 10) || 1)
  );
  const start = (page - 1) * PAGE_SIZE;
  const list = all.slice(start, start + PAGE_SIZE);

  return (
    <div className="mx-auto max-w-6xl px-5 py-14">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Trang chủ", item: site.url },
            { "@type": "ListItem", position: 2, name: "Cửa hàng", item: `${site.url}/shop` },
            {
              "@type": "ListItem",
              position: 3,
              name: category.name,
              item: `${site.url}/danh-muc/${category.slug}`,
            },
          ],
        }}
      />

      <nav className="mb-8 text-xs text-muted">
        <Link href="/" className="hover:text-ivory">
          Trang chủ
        </Link>{" "}
        / <Link href="/shop" className="hover:text-ivory">Cửa hàng</Link> /{" "}
        <span className="text-ivory">{category.name}</span>
      </nav>

      <div className="mb-8">
        <p className="text-xs uppercase tracking-wide text-gold">Danh mục</p>
        <h1 className="mt-2 font-serif text-3xl text-ivory">{category.name}</h1>
        <p className="mt-3 max-w-xl text-muted">{category.shortDescription}</p>
        <p className="mt-1 text-xs text-muted">{all.length} sản phẩm</p>
      </div>

      <div className="flex flex-col gap-8 md:flex-row">
        <Sidebar activeSlug={category.slug} />
        <div className="flex-1">
          {list.length === 0 ? (
            <p className="text-muted">Sản phẩm đang được cập nhật cho danh mục này.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
              {list.map((p) => (
                <ProductCard key={p.slug} product={p} />
              ))}
            </div>
          )}
          <Pagination
            basePath={`/danh-muc/${category.slug}`}
            currentPage={page}
            totalPages={totalPages}
          />
        </div>
      </div>
    </div>
  );
}
