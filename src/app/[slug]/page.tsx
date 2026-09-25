import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getProduct, formatPrice, products } from "@/data/products";
import ProductGallery from "@/components/ProductGallery";
import AddToCartButton from "@/components/AddToCartButton";
import JsonLd from "@/components/JsonLd";
import { site } from "@/lib/site";
import { Check } from "lucide-react";

// Data moi (sau khi chay script AI) la HTML thuan (<h2>, <p>, <ul>...).
// Data cu (chua kip viet lai) van la text thuong voi "## "/"- ". Ham nay
// tu nhan biet dinh dang de hien dung ca 2 truong hop trong luc migrate
// dan 1913 san pham, khong can lam moi luc.
function isHtmlContent(text: string) {
  return /^\s*</.test(text);
}

function renderLongDescription(text: string) {
  if (isHtmlContent(text)) {
    return (
      <div
        className="flex flex-col gap-3 [&_h2]:mt-4 [&_h2]:font-serif [&_h2]:text-lg [&_h2]:text-ivory [&_h3]:mt-3 [&_h3]:font-serif [&_h3]:text-base [&_h3]:text-ivory [&_p]:leading-relaxed [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-1 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:marker:text-gold [&_a]:text-gold [&_a]:underline [&_a]:underline-offset-2 [&_a]:hover:text-ivory"
        dangerouslySetInnerHTML={{ __html: text }}
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

export function generateStaticParams() {
  return products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = getProduct(slug);
  if (!product) return {};

  return {
    title: product.name,
    description: product.blurb,
    alternates: { canonical: `/${product.slug}` },
    openGraph: {
      title: `${product.name} | ${site.name}`,
      description: product.blurb,
      url: `${site.url}/product/${product.slug}`,
    },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = getProduct(slug);
  if (!product) return notFound();

  return (
    <div className="mx-auto max-w-6xl px-5 py-14">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Product",
          name: product.name,
          description: product.description,
          category: product.category,
          sku: product.sku,
          brand: { "@type": "Brand", name: site.name },
          image: product.image ? [product.image] : undefined,
          offers: {
            "@type": "Offer",
            priceCurrency: "VND",
            price: product.price,
            availability: "https://schema.org/InStock",
            url: `${site.url}/${product.slug}`,
          },
        }}
      />

      <nav className="mb-8 text-xs text-muted">
        <Link href="/" className="hover:text-ivory">
          Trang chủ
        </Link>{" "}
        /{" "}
        <Link href={`/danh-muc/${product.categorySlug}`} className="hover:text-ivory">
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
            {renderLongDescription(product.longDescription)}
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
