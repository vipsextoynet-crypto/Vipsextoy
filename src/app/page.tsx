import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { getProduct, formatPrice, products } from "@/data/products";
import ProductGlyph from "@/components/ProductGlyph";
import AddToCartButton from "@/components/AddToCartButton";
import JsonLd from "@/components/JsonLd";
import { site } from "@/lib/site";
import { Check } from "lucide-react";

export function generateStaticParams() {
  return products.map((p) => ({ slug: p.slug }));
}

export function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Metadata {
  const product = getProduct(params.slug);
  if (!product) return {};

  return {
    title: product.name,
    description: product.blurb,
    alternates: { canonical: `/product/${product.slug}` },
    openGraph: {
      title: `${product.name} | ${site.name}`,
      description: product.blurb,
      url: `${site.url}/product/${product.slug}`,
    },
  };
}

export default function ProductPage({
  params,
}: {
  params: { slug: string };
}) {
  const product = getProduct(params.slug);
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
            url: `${site.url}/product/${product.slug}`,
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
        <div className="relative flex aspect-square items-center justify-center overflow-hidden bg-surface p-16">
          {product.image ? (
            <Image
              src={product.image}
              alt={product.name}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-contain p-4"
              priority
            />
          ) : (
            <ProductGlyph type={product.icon} />
          )}
        </div>

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
          Giao hàng kín đáo trong 2–4 ngày làm việc. Hỗ trợ kiểm tra hàng
          trước khi thanh toán (COD) tại một số khu vực.
        </p>
      </div>
    </div>
  );
}
