import { notFound } from "next/navigation";
import Link from "next/link";
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
        <div className="flex aspect-square items-center justify-center overflow-hidden bg-surface p-16">
          {product.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.image}
              alt={product.name}
              loading="lazy"
              className="h-full w-full object-contain"
            />
          ) : (
            <ProductGlyph type={product.icon} />
          )}
        </div>

        <div>
          <p className="text-xs uppercase tracking-wide text-gold">
            {product.category}
          </p>
          <h1 className="mt-2 font-serif text-3xl uppercase text-ivory md:text-4xl">
            {product.name}
          </h1>
          <div className="mt-4 flex items-baseline gap-3">
            <span className="text-xl font-bold text-ivory">
              Giá: {formatPrice(product.price)}
            </span>
            {product.compareAt && (
              <span className="text-muted line-through">
                {formatPrice(product.compareAt)}
              </span>
            )}
          </div>
          <p className="mt-6 text-base font-medium leading-relaxed text-ivory">
            {product.description}
          </p>

          <ul className="mt-6 flex flex-col gap-2">
            {product.features.map((f) => (
              <li key={f} className="flex items-center gap-2 text-sm font-medium text-ivory">
                <Check size={14} className="text-gold" />
                {f}
              </li>
            ))}
          </ul>

          <div className="mt-8">
            <AddToCartButton product={product} />
          </div>

          {/* Chi tiet san pham.
              - Neu product.details da duoc dien tay trong products.ts: hien
                dung cac dong do (khong gioi han so luong).
              - Neu chua dien: hien 4 dong mac dinh nhu cu de trang khong bi
                trong. Xem huong dan dien tay ngay ben canh dinh nghia
                "details?" trong type Product tai src/data/products.ts. */}
          <div className="mt-10 border-t border-line pt-6">
            <h2 className="font-serif text-lg font-bold text-ivory">
              Chi tiết sản phẩm
            </h2>
            <dl className="mt-4 grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
              {product.details && product.details.length > 0 ? (
                product.details.map((d) => (
                  <div
                    key={d.label}
                    className="flex justify-between border-b border-line pb-2 sm:justify-start sm:gap-2"
                  >
                    <dt className="font-medium text-muted">{d.label}</dt>
                    <dd className="font-semibold text-ivory">{d.value}</dd>
                  </div>
                ))
              ) : (
                <>
                  <div className="flex justify-between border-b border-line pb-2 sm:justify-start sm:gap-2">
                    <dt className="font-medium text-muted">Danh mục</dt>
                    <dd className="font-semibold text-ivory">{product.category}</dd>
                  </div>
                  <div className="flex justify-between border-b border-line pb-2 sm:justify-start sm:gap-2">
                    <dt className="font-medium text-muted">Tình trạng</dt>
                    <dd className="font-semibold text-ivory">Còn hàng</dd>
                  </div>
                  <div className="flex justify-between border-b border-line pb-2 sm:justify-start sm:gap-2">
                    <dt className="font-medium text-muted">Đóng gói</dt>
                    <dd className="font-semibold text-ivory">Kín đáo, riêng tư</dd>
                  </div>
                  <div className="flex justify-between border-b border-line pb-2 sm:justify-start sm:gap-2">
                    <dt className="font-medium text-muted">Bảo hành</dt>
                    <dd className="font-semibold text-ivory">3 tháng lỗi NSX</dd>
                  </div>
                </>
              )}
            </dl>
            <p className="mt-4 text-sm font-medium text-muted">
              Cần thêm thông số (chất liệu, kích thước, dung tích pin...)? Nhắn
              hotline <a href={site.phoneHref} className="font-semibold text-gold">{site.phone}</a> để được tư vấn chi tiết trước khi đặt hàng.
            </p>
          </div>

          <div className="mt-8 border-t border-line pt-6 text-xs font-medium text-muted">
            Giao hàng kín đáo trong 2–4 ngày làm việc. Hỗ trợ kiểm tra hàng
            trước khi thanh toán (COD) tại một số khu vực.
          </div>
        </div>
      </div>
    </div>
  );
}
