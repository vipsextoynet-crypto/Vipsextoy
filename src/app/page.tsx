import Link from "next/link";
import { categories, getProductsByCategory } from "@/data/products";
import { blogPosts } from "@/data/blog";
import ProductCard from "@/components/ProductCard";
import Sidebar from "@/components/Sidebar";
import CategoryCircles from "@/components/CategoryCircles";
import HeroBanner from "@/components/HeroBanner";
import HomeSearch from "@/components/HomeSearch";
import BlogCardImage from "@/components/BlogCardImage";
import { resolveBlogImage } from "@/lib/blog-image";

// Trang chủ hiện TẤT CẢ danh mục, mỗi danh mục 12 sản phẩm = 3 hàng x 4 cột
// (máy tính). Thứ tự CỐ ĐỊNH (không ngẫu nhiên, mới nhất lên đầu) để Google thấy
// cùng một bộ link nội bộ mỗi lần và trang được tạo sẵn (nhanh). Đổi số nếu cần:
//  - PRODUCTS_PER_ROW: số sản phẩm mỗi danh mục (12 chia hết cho 2, 3 và 4 cột).
//  - HOMEPAGE_CATEGORY_LIMIT: số danh mục tối đa (Infinity = hiện hết). Nếu điểm
//    PageSpeed trên điện thoại giảm nhiều, hạ xuống (vd 12) rồi đo lại.
const PRODUCTS_PER_ROW = 12;
const HOMEPAGE_CATEGORY_LIMIT = Infinity;
// Danh mục KHÔNG hiện ở trang chủ ("Chưa phân loại" chỉ là nơi chứa tạm, không
// phải danh mục thật cho khách). Muốn hiện lại thì xóa dòng slug ở đây.
const HIDDEN_ON_HOME = new Set(["chua-phan-loai"]);
// SẢN PHẨM MỚI NHẤT LÊN ĐẦU mỗi danh mục. Trang web không lưu ngày đăng, nên "mới
// nhất" được suy ra từ vị trí trong src/data/products.ts. Hãy kiểm tra 1 lần:
// mở products.ts, bấm Ctrl+End (xuống cuối file):
//  - sản phẩm CUỐI CÙNG là sản phẩm bạn vừa đăng bằng admin  -> để true
//  - sản phẩm bạn vừa đăng nằm ở ĐẦU danh sách                -> đổi thành false
const NEW_PRODUCTS_AT_END_OF_FILE = true;

export default function Home() {
  const homeCategories = categories
    .filter((c) => !HIDDEN_ON_HOME.has(c.slug))
    .slice(0, HOMEPAGE_CATEGORY_LIMIT);
  const latestPosts = blogPosts.slice(0, 3);

  return (
    <div>
      {/* Banner — thay ảnh thật trong src/components/HeroBanner.tsx */}
      <section className="px-0 pb-4 pt-4 md:pb-5 md:pt-6">
        <HeroBanner />
      </section>

      {/* Ô tìm kiếm: chỉ hiện trên mobile (PC đã có ô tìm kiếm ở header),
          thu vào cùng bề ngang với banner và danh mục. */}
      <div className="mx-auto max-w-6xl px-5 pb-5 md:hidden">
        <HomeSearch />
      </div>

      {/* Danh mục: mobile = ô tròn danh mục cha, PC = Sidebar bên trái.
          Danh mục chỉ xuất hiện ở trang chủ. */}
      <section className="mx-auto max-w-6xl px-5 py-4 md:pb-14 md:pt-0">
        <div className="mb-8 md:hidden">
          <CategoryCircles />
        </div>

        <div className="flex flex-col gap-8 md:flex-row">
          <div className="hidden shrink-0 md:block">
            <Sidebar />
          </div>
          <div className="flex-1 flex-col gap-14 md:flex">
            {homeCategories.map((c, catIndex) => {
              // Mới nhất lên đầu; sản phẩm có ảnh lên trước (tránh ô trống ảnh).
              // Thứ tự luôn cố định giữa các lần truy cập, chỉ đổi khi có sản phẩm mới.
              const raw = getProductsByCategory(c.slug);
              const inCategory = NEW_PRODUCTS_AT_END_OF_FILE ? [...raw].reverse() : raw;
              const hasImg = (p: (typeof inCategory)[number]) => !!(p.thumb || p.image);
              const catProducts = [
                ...inCategory.filter(hasImg),
                ...inCategory.filter((p) => !hasImg(p)),
              ].slice(0, PRODUCTS_PER_ROW);
              if (catProducts.length === 0) return null;
              return (
                <div
                  key={c.slug}
                  className="mb-14 [content-visibility:auto] [contain-intrinsic-size:auto_1200px] md:mb-0"
                >
                  <div className="mb-6 flex items-center justify-between bg-gold px-5 py-3">
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-white">
                      {c.name}
                    </h2>
                    <Link
                      href={`/${c.slug}`}
                      className="text-xs text-white hover:underline"
                    >
                      Xem tất cả →
                    </Link>
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
                      {catProducts.map((p, i) => (
                        <ProductCard key={p.slug} product={p} priority={catIndex === 0 && i < 4} />
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
                Xem toàn bộ sản phẩm →
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
              <div className="relative flex aspect-[16/10] items-center justify-center overflow-hidden bg-surface2 p-10">
                <BlogCardImage image={resolveBlogImage(post.image)} icon={post.icon} alt={post.title} />
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
