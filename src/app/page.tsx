import Link from "next/link";
import { categories, getProductsByCategory } from "@/data/products";
import { blogPosts } from "@/data/blog";
import ProductCard from "@/components/ProductCard";
import ProductGlyph from "@/components/ProductGlyph";
import Sidebar from "@/components/Sidebar";
import HeroBanner from "@/components/HeroBanner";

// Số sản phẩm hiển thị cho mỗi danh mục trên trang chủ, và số danh mục hiện ra
// trước khi phải bấm "Xem tất cả danh mục" (tránh trang chủ quá dài với 15 danh mục).
const PRODUCTS_PER_ROW = 8;
const HOMEPAGE_CATEGORY_LIMIT = 6;

export default function Home() {
  const homeCategories = categories.slice(0, HOMEPAGE_CATEGORY_LIMIT);
  const latestPosts = blogPosts.slice(0, 3);

  return (
    <div>
      {/* Banner — thay ảnh thật trong src/components/HeroBanner.tsx */}
      <section className="px-0 pb-10 pt-6">
        <HeroBanner />
      </section>

      {/* Sidebar danh mục + từng danh mục 1 hàng sản phẩm */}
      <section className="mx-auto max-w-6xl px-5 py-14">
        <div className="flex flex-col gap-8 md:flex-row">
          <Sidebar />
          <div className="flex-1 flex-col gap-14 md:flex">
            {homeCategories.map((c) => {
              const catProducts = getProductsByCategory(c.slug).slice(
                0,
                PRODUCTS_PER_ROW
              );
              if (catProducts.length === 0) return null;
              return (
                <div key={c.slug} className="mb-14 md:mb-0">
                  <div className="mb-6 flex items-center justify-between bg-gold px-5 py-3">
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-white">
                      {c.name}
                    </h2>
                    <Link
                      href={`/danh-muc/${c.slug}`}
                      className="text-xs text-white/90 hover:text-white"
                    >
                      Xem tất cả →
                    </Link>
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
                    {catProducts.map((p) => (
                      <ProductCard key={p.slug} product={p} />
                    ))}
                  </div>
                </div>
              );
            })}

            <div className="text-center">
              <Link
                href="/shop"
                className="inline-block border border-line px-7 py-3 text-sm tracking-wide text-ivory transition hover:border-gold hover:text-gold"
              >
                Xem toàn bộ {categories.length} danh mục sản phẩm →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="border-y border-line bg-surface/40">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <p className="text-xs uppercase tracking-wide text-gold">
            Khách hàng nói gì
          </p>
          <h2 className="mt-2 font-serif text-2xl text-ivory md:text-3xl">
            Được tin tưởng bởi hàng nghìn khách hàng
          </h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {[
              {
                name: "Khách hàng tại TP.HCM",
                text: "Đóng gói rất kín đáo, không ai biết bên trong là gì. Giao hàng nhanh hơn mình nghĩ.",
              },
              {
                name: "Khách hàng tại Hà Nội",
                text: "Chất lượng sản phẩm tốt, đúng như mô tả. Tư vấn nhiệt tình, sẽ ủng hộ shop lâu dài.",
              },
              {
                name: "Khách hàng tại Đà Nẵng",
                text: "Lần đầu mua còn hơi ngại nhưng nhân viên tư vấn rất tinh tế và chuyên nghiệp.",
              },
            ].map((t) => (
              <div key={t.name} className="border border-line bg-surface p-6">
                <p className="text-sm leading-relaxed text-muted">“{t.text}”</p>
                <p className="mt-4 text-xs uppercase tracking-wide text-gold">
                  {t.name}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Blog preview */}
      <section className="mx-auto max-w-6xl px-5 py-20">
        <div className="mb-10 flex items-end justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-gold">
              Góc chia sẻ
            </p>
            <h2 className="mt-2 font-serif text-2xl text-ivory md:text-3xl">
              Từ blog của Vipsextoy
            </h2>
          </div>
          <Link href="/blog" className="text-sm text-muted hover:text-ivory">
            Xem tất cả →
          </Link>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {latestPosts.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="group flex flex-col border border-line bg-surface transition hover:border-gold/50"
            >
              <div className="flex aspect-[16/10] items-center justify-center bg-surface2 p-10">
                <ProductGlyph type={post.icon} className="max-h-20 max-w-20" />
              </div>
              <div className="flex flex-1 flex-col gap-2 p-5">
                <p className="text-xs uppercase tracking-wide text-muted">
                  {post.category}
                </p>
                <h3 className="font-serif text-lg leading-snug text-ivory">
                  {post.title}
                </h3>
                <p className="mt-1 line-clamp-2 text-sm text-muted">
                  {post.excerpt}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Newsletter */}
      <section className="border-t border-line bg-surface/40">
        <div className="mx-auto flex max-w-3xl flex-col items-center px-5 py-20 text-center">
          <h2 className="font-serif text-2xl text-ivory md:text-3xl">
            Nhận ưu đãi mới nhất, kín đáo trong hộp thư của bạn
          </h2>
          <p className="mt-3 max-w-md text-sm text-muted">
            Đăng ký để nhận thông tin sản phẩm mới và ưu đãi độc quyền. Không spam, huỷ đăng ký bất cứ lúc nào.
          </p>
          <form className="mt-7 flex w-full max-w-md flex-col gap-3 sm:flex-row">
            <input
              type="email"
              required
              placeholder="Email của bạn"
              className="flex-1 border border-line bg-surface px-4 py-3 text-sm text-ivory outline-none focus:border-gold"
            />
            <button
              type="submit"
              className="bg-gold px-6 py-3 text-sm tracking-wide text-background transition hover:bg-ivory"
            >
              Đăng ký
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
