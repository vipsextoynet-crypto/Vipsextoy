import { notFound, permanentRedirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import ProductCard from "@/components/ProductCard";
import Pagination from "@/components/Pagination";
import JsonLd from "@/components/JsonLd";
import { site } from "@/lib/site";
import { buildMetadata } from "@/lib/seo";
import { getGroups, getGroup, getProductsByGroup } from "@/lib/groups";

const PAGE_SIZE = 50;

export function generateStaticParams() {
  return getGroups().map((g) => ({ slug: g.slug }));
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
  const group = getGroup(slug);
  if (!group) return {};

  const all = getProductsByGroup(group.items);
  const totalPages = Math.max(1, Math.ceil(all.length / PAGE_SIZE));
  const page = Math.min(
    totalPages,
    Math.max(1, parseInt(pageParam ?? "1", 10) || 1)
  );
  const basePath = `/nhom/${group.slug}`;
  const names = group.items.map((c) => c.name).join(", ");

  return buildMetadata({
    title: page > 1 ? `${group.name} - Trang ${page}` : group.name,
    description: `Tổng hợp sản phẩm ${group.name} tại Vipsextoy: ${names}. Giao hàng kín đáo toàn quốc.`,
    path: page > 1 ? `${basePath}?page=${page}` : basePath,
    image: all[0]?.image,
  });
}

export default async function GroupPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { slug } = await params;
  const { page: pageParam } = await searchParams;
  const group = getGroup(slug);
  if (!group) return notFound();
  // Nhóm chỉ có 1 danh mục con: trùng nội dung với trang danh mục, chuyển thẳng sang đó.
  if (group.items.length === 1) {
    permanentRedirect(`/danh-muc/${group.items[0].slug}`);
  }

  const all = getProductsByGroup(group.items);
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
            {
              "@type": "ListItem",
              position: 2,
              name: group.name,
              item: `${site.url}/nhom/${group.slug}`,
            },
          ],
        }}
      />

      <nav className="mb-6 text-xs text-muted">
        <Link href="/" className="hover:text-ivory">
          Trang chủ
        </Link>{" "}
        / <span className="text-ivory">{group.name}</span>
      </nav>

      <div className="mb-8">
        <h1 className="font-serif text-2xl capitalize text-ivory md:text-3xl">
          {group.name}
        </h1>
        <p className="mt-2 text-xs text-muted">{all.length} sản phẩm</p>
      </div>

      {list.length === 0 ? (
        <p className="text-muted">Sản phẩm đang được cập nhật.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
          {list.map((p, i) => (
            <ProductCard key={p.slug} product={p} priority={page === 1 && i < 4} />
          ))}
        </div>
      )}
      <Pagination
        basePath={`/nhom/${group.slug}`}
        currentPage={page}
        totalPages={totalPages}
      />
    </div>
  );
}
