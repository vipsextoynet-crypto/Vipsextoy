import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getProduct, formatPrice, products, categories, getCategory } from "@/data/products";
import ProductGallery from "@/components/ProductGallery";
import AddToCartButton from "@/components/AddToCartButton";
import JsonLd from "@/components/JsonLd";
import { site } from "@/lib/site";
import { absoluteUrl, buildMetadata } from "@/lib/seo";
import { Check } from "lucide-react";
import GroupView, { getGroupMetadata } from "@/components/GroupView";
import CategoryView, { getCategoryMetadata } from "@/components/CategoryView";
import { getGroups, getGroup } from "@/lib/groups";

// Ngay het han gia cho JSON-LD Offer (Google khuyen nghi co truong nay).
// Tinh 1 lan luc build = ngay build + 1 nam; web build lai thuong xuyen
// (moi lan dang blog) nen luon la ngay trong tuong lai.
const PRICE_VALID_UNTIL = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
  .toISOString()
  .slice(0, 10);

// Data moi (sau khi chay script AI) la HTML thuan (<h2>, <p>, <ul>...).
// Data cu (chua kip viet lai) van la text thuong voi "## "/"- ". Ham nay
// tu nhan biet dinh dang de hien dung ca 2 truong hop trong luc migrate
// dan 1913 san pham, khong can lam moi luc.
function isHtmlContent(text: string) {
  return /^\s*</.test(text);
}

// Chen anh vao ngay sau moi the <h2> (dung anh that cua san pham, khong
// lap lai anh nao ca). Anh du (nhieu hon so luong h2) thi gom vao 1 dai
// nho o cuoi bai, dam bao dung het toan bo anh co san.
function interleaveImagesAfterH2(html: string, images: string[], altBase: string) {
  if (!images || images.length === 0) return html;

  let used = 0;
  const withInline = html.replace(/<\/h2>/g, () => {
    if (used >= images.length) return "</h2>";
    const src = images[used];
    used += 1;
    return `</h2><figure class="my-1 overflow-hidden border border-line bg-surface"><img src="${src}" alt="${altBase} - hình minh họa ${used}" loading="lazy" width="800" height="800" class="aspect-square w-full object-contain" /></figure>`;
  });

  if (used >= images.length) return withInline;

  const rest = images.slice(used);
  const restHtml = rest
    .map(
      (src, i) =>
        `<div class="aspect-square overflow-hidden border border-line bg-surface"><img src="${src}" alt="${altBase} - hình minh họa ${used + i + 1}" loading="lazy" width="400" height="400" class="h-full w-full object-contain" /></div>`
    )
    .join("");

  return (
    withInline +
    `<div class="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3">${restHtml}</div>`
  );
}

function renderLongDescription(text: string, images: string[], altBase: string) {
  if (isHtmlContent(text)) {
    const html = interleaveImagesAfterH2(text, images, altBase);
    return (
      <div
        className="flex flex-col gap-3 [&_h2]:mt-4 [&_h2]:font-serif [&_h2]:text-lg [&_h2]:text-ivory [&_h3]:mt-3 [&_h3]:font-serif [&_h3]:text-base [&_h3]:text-ivory [&_p]:leading-relaxed [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-1 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:marker:text-gold [&_a]:text-gold [&_a]:underline [&_a]:underline-offset-2 [&_a]:hover:text-ivory [&_figure]:my-1 [&_img]:rounded-none"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }
  return renderMarkdownLite(text);
}

// Parser markdown-nhe cho data CU: dong bat dau "## " -> tieu de phu (h3),
// dong bat dau "- " -> gom thanh 1 danh sach <ul>, con lai la doan van <p>.
function renderMarkdownLite(text: string) {
  const lines = text
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);

  const blocks: ReactNode[] = [];
  let currentList: string[] = [];

  const flushList = () => {
    if (currentList.length > 0) {
      blocks.push(
        <ul key={`ul-${blocks.length}`} className="flex flex-col gap-1 pl-5 list-disc marker:text-gold">
          {currentList.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      );
      currentList = [];
    }
  };

  lines.forEach((line, i) => {
    if (line.startsWith("## ")) {
      flushList();
      blocks.push(
        <h3 key={`h-${i}`} className="mt-2 font-serif text-base text-ivory">
          {line.replace(/^##\s*/, "")}
        </h3>
      );
    } else if (line.startsWith("- ")) {
      currentList.push(line.replace(/^-\s*/, ""));
    } else {
      flushList();
      blocks.push(<p key={`p-${i}`}>{line}</p>);
    }
  });
  flushList();

  return blocks;
}

// /[slug] phục vụ 3 loại trang: sản phẩm, danh mục, nhóm danh mục.
// Thứ tự ưu tiên khi trùng slug: sản phẩm > danh mục > nhóm.
export function generateStaticParams() {
  const seen = new Set(products.map((p) => p.slug));
  const extra: { slug: string }[] = [];
  for (const slug of [
    ...categories.map((c) => c.slug),
    ...getGroups().map((g) => g.slug),
  ]) {
    if (seen.has(slug)) {
      console.warn(`[slug] Trùng slug "${slug}" - chỉ một trang được hiển thị, hãy đổi slug.`);
      continue;
    }
    seen.add(slug);
    extra.push({ slug });
  }
  return [...products.map((p) => ({ slug: p.slug })), ...extra];
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = getProduct(slug);
  if (!product) {
    // Không phải sản phẩm -> thử danh mục, rồi nhóm (chỉ lúc này mới đọc searchParams).
    if (getCategory(slug)) {
      const { page } = await searchParams;
      return getCategoryMetadata(slug, page);
    }
    if (getGroup(slug)) {
      const { page } = await searchParams;
      return getGroupMetadata(slug, page);
    }
    return {};
  }

  // Truoc day og:url tro sai sang /product/<slug> (khong ton tai) va khong
  // co og:image. Gio dung chung helper: canonical, og:url deu la /<slug>,
  // anh chia se la anh san pham.
  return buildMetadata({
    title: product.name,
    description: product.blurb,
    path: `/${product.slug}`,
    image: product.image ?? product.images?.[0],
  });
}

export default async function ProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { slug } = await params;
  const product = getProduct(slug);
  if (!product) {
    if (getCategory(slug)) {
      const { page } = await searchParams;
      return <CategoryView slug={slug} pageParam={page} />;
    }
    if (getGroup(slug)) {
      const { page } = await searchParams;
      return <GroupView slug={slug} pageParam={page} />;
    }
    return notFound();
  }

  const productUrl = `${site.url}/${product.slug}`;
  // Tat ca anh cua san pham (bo trung), doi sang URL tuyet doi cho JSON-LD.
  const jsonLdImages = Array.from(
    new Set(
      [product.image, ...(product.images || [])].filter(
        (u): u is string => !!u
      )
    )
  ).map(absoluteUrl);

  return (
    <div className="mx-auto max-w-6xl px-5 py-14">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Product",
          "@id": `${productUrl}#product`,
          name: product.name,
          description: product.description,
          category: product.category,
          sku: product.sku,
          url: productUrl,
          brand: { "@type": "Brand", name: site.name },
          image: jsonLdImages.length > 0 ? jsonLdImages : undefined,
          offers: {
            "@type": "Offer",
            priceCurrency: "VND",
            price: product.price,
            priceValidUntil: PRICE_VALID_UNTIL,
            itemCondition: "https://schema.org/NewCondition",
            availability: "https://schema.org/InStock",
            url: productUrl,
            seller: { "@type": "Organization", name: site.name, url: site.url },
          },
        }}
      />

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Trang chủ", item: site.url },
            {
              "@type": "ListItem",
              position: 2,
              name: product.category,
              item: `${site.url}/${product.categorySlug}`,
            },
            { "@type": "ListItem", position: 3, name: product.name, item: productUrl },
          ],
        }}
      />

      <nav className="mb-8 text-xs text-muted">
        <Link href="/" className="hover:text-ivory">
          Trang chủ
        </Link>{" "}
        /{" "}
        <Link href={`/${product.categorySlug}`} className="hover:text-ivory">
          {product.category}
        </Link>{" "}
        / <span className="text-ivory">{product.name}</span>
      </nav>

      <div className="grid gap-12 md:grid-cols-2">
        <ProductGallery
          images={
            product.image
              ? [product.image, ...(product.images || []).filter((u) => u !== product.image)]
              : product.images
          }
          icon={product.icon}
          name={product.name}
        />

        <div>
          <p className="text-xs uppercase tracking-wide text-gold">
            {product.category}
          </p>
          <h1 className="mt-2 font-serif text-3xl text-ivory md:text-4xl">
            {product.name}
          </h1>
          <div className="mt-4 flex flex-wrap items-baseline gap-x-6 gap-y-1">
            <div className="flex items-baseline gap-3">
              <span className="text-xl text-ivory">
                Giá: {formatPrice(product.price)}
              </span>
              {product.compareAt && (
                <span className="text-muted line-through">
                  {formatPrice(product.compareAt)}
                </span>
              )}
            </div>
            <span className="text-sm text-muted">
              Mã sản phẩm: <span className="text-ivory">{product.sku}</span>
            </span>
          </div>
          <p className="mt-6 leading-relaxed text-muted">
            {product.description}
          </p>

          <ul className="mt-6 flex flex-col gap-2">
            {product.features.map((f) => (
              <li key={f} className="flex items-center gap-2 text-sm text-ivory">
                <Check size={14} className="text-gold" />
                {f}
              </li>
            ))}
          </ul>

          <div className="mt-8">
            <AddToCartButton product={product} />
          </div>
        </div>
      </div>

      {/* Chi tiết sản phẩm — đặt riêng, căn giữa trang, dưới cả 2 cột */}
      <div className="mx-auto mt-14 max-w-3xl border border-line bg-surface p-6 sm:p-8">
        <h2 className="font-serif text-xl text-ivory">Chi tiết sản phẩm</h2>
        {product.longDescription && (
          <div className="mt-5 flex flex-col gap-3 text-sm leading-relaxed text-muted">
            {renderLongDescription(
              product.longDescription,
              product.image
                ? [product.image, ...(product.images || []).filter((u) => u !== product.image)]
                : product.images || [],
              product.name
            )}
          </div>
        )}
        <dl className="mt-5 grid gap-4 border-t border-line pt-5 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted">Danh mục</dt>
            <dd className="mt-1 text-ivory">{product.category}</dd>
          </div>
          <div>
            <dt className="text-muted">Tình trạng</dt>
            <dd className="mt-1 text-ivory">Còn hàng</dd>
          </div>
          <div>
            <dt className="text-muted">Đóng gói</dt>
            <dd className="mt-1 text-ivory">Kín đáo, riêng tư</dd>
          </div>
          <div>
            <dt className="text-muted">Bảo hành</dt>
            <dd className="mt-1 text-ivory">3 tháng lỗi NSX</dd>
          </div>
        </dl>

        <p className="mt-6 border-t border-line pt-5 text-sm text-muted">
          Cần thêm thông số (chất liệu, kích thước, dung tích pin...)? Nhắn
          hotline{" "}
          <a href={site.phoneHref} className="font-semibold text-gold">
            {site.phone}
          </a>{" "}
          để được tư vấn chi tiết trước khi đặt hàng.
        </p>
        <p className="mt-3 text-sm text-muted">
          Giao nhanh 1–3 ngày. Ship COD toàn quốc.
        </p>
      </div>
    </div>
  );
}
