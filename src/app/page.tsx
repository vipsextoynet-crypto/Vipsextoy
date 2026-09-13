import Link from "next/link";
import {
  categories,
  getProductsByCategory,
} from "@/data/products";
import { blogPosts } from "@/data/blog";
import { site } from "@/lib/site";
import ProductCard from "@/components/ProductCard";
import ProductGlyph from "@/components/ProductGlyph";
import Sidebar from "@/components/Sidebar";
import Banner from "@/components/Banner";
import { ShieldCheck, Package, Sparkles } from "lucide-react";

// Hien TAT CA danh muc co san pham tren trang chu, moi danh muc 1 hang san pham
// (giong bo cuc "DO CHOI TINH DUC CHO NAM" trong ban thiet ke tham chieu).
// Luu y hieu nang: nhieu danh muc = nhieu anh hon, nhung next/image da lazy-load
// tat ca cac hang ngoai vung nhin dau tien nen khong lam cham lan tai dau.
const PRODUCTS_PER_ROW = 4;

export default function Home() {
  const featuredCategories = categories
    .map((c) => ({ category: c, items: getProductsByCategory(c.slug) }))
    .filter((c) => c.items.length > 0);
  const latestPosts = blogPosts.slice(0, 3);

  return (
    <div>
      {/* Banner - vi tri chinh giua dau trang, ngay duoi menu */}
      <div className="mx-auto max-w-6xl px-5 pt-5">
        <Banner />
      </div>

      {/* Sidebar + luoi san pham theo danh muc */}
      <section className="mx-auto max-w-6xl px-5 py-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-start">
          <Sidebar />
          <div className="flex-1 min-w-0">
            {featuredCategories.map(({ category, items }) => (
              <div key={category.slug} className="mb-10 last:mb-0">
                <div className="mb-4 flex items-end justify-between border-b-2 border-gold pb-2">
                  <h2 className="font-serif text-lg font-bold uppercase tracking-wide text-gold sm:text-xl">
                    {category.name}
                  </h2>
                  <Link
                    href={`/danh-muc/${category.slug}`}
                    className="whitespace-nowrap text-xs text-muted hover:text-gold"
                  >
                    Xem tất cả →
                  </Link>
                </div>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                  {items.slice(0, PRODUCTS_PER_ROW).map((p) => (
                    <ProductCard key={p.slug} product={p} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <section className="border-y border-line bg-surface">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-10 sm:grid-cols-3">
          <div className="flex items-center gap-3">
            <Package size={20} strokeWidth={1.4} className="text-gold" />
            <span className="text-sm text-muted">Đóng gói trung lập, kín đáo</span>
          </div>
          <div className="flex items-center gap-3">
            <ShieldCheck size={20} strokeWidth={1.4} className="text-gold" />
            <span className="text-sm text-muted">Bảo hành chính hãng 3 tháng</span>
          </div>
          <div className="flex items-center gap-3">
            <Sparkles size={20} strokeWidth={1.4} className="text-gold" />
            <span className="text-sm text-muted">Chất liệu an toàn, đạt chuẩn</span>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="border-y border-line bg-surface">
        <div className="mx-auto max-w-6xl px-5 py-16">
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
              <div key={t.name} className="border border-line bg-surface2 p-6">
                <p className="text-sm leading-relaxed text-muted">&ldquo;{t.text}&rdquo;</p>
                <p className="mt-4 text-xs uppercase tracking-wide text-gold">
                  {t.name}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Blog preview */}
      <section className="mx-auto max-w-6xl px-5 py-16">
        <div className="mb-10 flex items-end justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-gold">
              Góc chia sẻ
            </p>
            <h2 className="mt-2 font-serif text-2xl text-ivory md:text-3xl">
              Từ blog của {site.name}
            </h2>
          </div>
          <Link href="/blog" className="text-sm text-muted hover:text-gold">
            Xem tất cả →
          </Link>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {latestPosts.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="group flex flex-col border border-line bg-surface transition hover:border-gold"
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
      <section className="border-t border-line bg-surface">
        <div className="mx-auto flex max-w-3xl flex-col items-center px-5 py-16 text-center">
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
              className="bg-gold px-6 py-3 text-sm font-medium tracking-wide text-white transition hover:bg-gold-dark"
            >
              Đăng ký
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
