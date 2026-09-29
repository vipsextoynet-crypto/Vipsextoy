import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { categories, getCategory, getProductsByCategory } from "@/data/products";
import ProductCard from "@/components/ProductCard";
import Pagination from "@/components/Pagination";
import JsonLd from "@/components/JsonLd";
import { site } from "@/lib/site";
import { buildMetadata } from "@/lib/seo";

const PAGE_SIZE = 52;

export function generateStaticParams() {
  return categories.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const { page: pageParam } = await searchParams;
  const category = getCategory(slug);
  if (!category) return {};

  const all = getProductsByCategory(category.slug);
  const totalPages = Math.max(1, Math.ceil(all.length / PAGE_SIZE));
  const page = Math.min(
    totalPages,
    Math.max(1, parseInt(pageParam ?? "1", 10) || 1)
  );

  const basePath = `/danh-muc/${category.slug}`;

  // Moi trang phan trang tu tro ve chinh no (canonical rieng) va co tieu de
  // rieng, tranh Google coi trang 2, 3... la ban trung cua trang 1.
  return buildMetadata({
    title: page > 1 ? `${category.name} - Trang ${page}` : category.name,
    description:
      page > 1
        ? `${category.seoDescription} (Trang ${page}/${totalPages})`
        : category.seoDescription,
    path: page > 1 ? `${basePath}?page=${page}` : basePath,
    image: all[0]?.image,
  });
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
    <div className="mx-auto max-w-6xl px-5 py-8 md:py-14">
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

      <nav className="mb-6 text-xs text-muted">
        <Link href="/" className="hover:text-ivory">
          Trang chủ
        </Link>{" "}
        / <Link href="/shop" className="hover:text-ivory">Cửa hàng</Link> /{" "}
        <span className="text-ivory">{category.name}</span>
      </nav>

      <div className="mb-8">
        <h1 className="font-serif text-2xl text-ivory md:text-3xl">{category.name}</h1>
        <p className="mt-3 max-w-xl text-muted">{category.shortDescription}</p>
        <p className="mt-1 text-xs text-muted">{all.length} sản phẩm</p>
      </div>

      {list.length === 0 ? (
        <p className="text-muted">Sản phẩm đang được cập nhật cho danh mục này.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
          {list.map((p, i) => (
            <ProductCard key={p.slug} product={p} priority={page === 1 && i < 4} />
          ))}
        </div>
      )}
      <Pagination
        basePath={`/danh-muc/${category.slug}`}
        currentPage={page}
        totalPages={totalPages}
      />
    </div>
  );
}
