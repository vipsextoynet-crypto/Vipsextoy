import Link from "next/link";
import { Lock, Package, Truck, Phone, Mail } from "lucide-react";
import { site } from "@/lib/site";

function FacebookIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M14 13.5h2.5l1-4H14v-2c0-1.03 0-2 2-2h1.5V2.14C17.17 2.1 15.95 2 14.67 2 11.98 2 10 3.66 10 6.7v2.8H7v4h3V22h4v-8.5Z" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export default function Footer() {
  return (
    <footer className="border-t border-line">
      <div id="privacy" className="mx-auto grid max-w-6xl gap-10 px-5 py-16 md:grid-cols-3">
        <div className="flex gap-4">
          <Package size={22} strokeWidth={1.3} className="mt-1 shrink-0 text-gold" />
          <div>
            <p className="text-sm text-ivory">Đóng gói kín đáo</p>
            <p className="mt-1 text-sm text-muted">
              Không in tên hay hình ảnh sản phẩm bên ngoài hộp. Tên người gửi trung lập.
            </p>
          </div>
        </div>
        <div className="flex gap-4">
          <Lock size={22} strokeWidth={1.3} className="mt-1 shrink-0 text-gold" />
          <div>
            <p className="text-sm text-ivory">Thanh toán riêng tư</p>
            <p className="mt-1 text-sm text-muted">
              Tên giao dịch hiển thị trung lập trên sao kê ngân hàng của bạn.
            </p>
          </div>
        </div>
        <div className="flex gap-4">
          <Truck size={22} strokeWidth={1.3} className="mt-1 shrink-0 text-gold" />
          <div>
            <p className="text-sm text-ivory">Giao hàng toàn quốc</p>
            <p className="mt-1 text-sm text-muted">
              2–4 ngày làm việc. Kiểm tra hàng trước khi thanh toán (COD).
            </p>
          </div>
        </div>
      </div>

      <div className="border-t border-line">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 sm:grid-cols-2 md:grid-cols-4">
          <div>
            <p className="font-serif text-lg text-ivory">
              Vipex<span className="text-gold">toy</span>
            </p>
            <p className="mt-3 max-w-[220px] text-sm text-muted">
              Sản phẩm chăm sóc cá nhân cao cấp, riêng tư và an toàn cho người trưởng thành.
            </p>
            <div className="mt-5 flex gap-4">
              <a
                href={site.social.facebook}
                aria-label="Facebook"
                className="text-muted transition hover:text-gold"
              >
                <FacebookIcon />
              </a>
              <a
                href={site.social.instagram}
                aria-label="Instagram"
                className="text-muted transition hover:text-gold"
              >
                <InstagramIcon />
              </a>
            </div>
          </div>

          <div>
            <p className="text-sm text-ivory">Hỗ trợ</p>
            <ul className="mt-4 flex flex-col gap-2.5 text-sm text-muted">
              <li>
                <Link href="/gioi-thieu" className="transition hover:text-ivory">
                  Giới thiệu
                </Link>
              </li>
              <li>
                <Link href="/blog" className="transition hover:text-ivory">
                  Blog
                </Link>
              </li>
              <li>
                <Link href="/lien-he" className="transition hover:text-ivory">
                  Liên hệ
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <p className="text-sm text-ivory">Chính sách</p>
            <ul className="mt-4 flex flex-col gap-2.5 text-sm text-muted">
              <li>
                <Link href="/chinh-sach/van-chuyen" className="transition hover:text-ivory">
                  Chính sách vận chuyển
                </Link>
              </li>
              <li>
                <Link href="/chinh-sach/doi-tra" className="transition hover:text-ivory">
                  Chính sách đổi trả
                </Link>
              </li>
              <li>
                <Link href="/chinh-sach/thanh-toan" className="transition hover:text-ivory">
                  Chính sách thanh toán
                </Link>
              </li>
              <li>
                <Link href="/chinh-sach/bao-mat" className="transition hover:text-ivory">
                  Chính sách bảo mật
                </Link>
              </li>
              <li>
                <Link href="/chinh-sach/dieu-khoan" className="transition hover:text-ivory">
                  Điều khoản sử dụng
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <p className="text-sm text-ivory">Liên hệ</p>
            <ul className="mt-4 flex flex-col gap-3 text-sm text-muted">
              <li className="flex items-center gap-2">
                <Phone size={15} strokeWidth={1.5} className="text-gold" />
                <a href={site.phoneHref} className="transition hover:text-ivory">
                  {site.phone}
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Mail size={15} strokeWidth={1.5} className="text-gold" />
                <a href={`mailto:${site.email}`} className="transition hover:text-ivory">
                  {site.email}
                </a>
              </li>
              <li className="text-muted">{site.address}</li>
              <li className="text-muted">{site.hours}</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="border-t border-line px-5 py-6 text-center text-xs text-muted">
        © {new Date().getFullYear()} Vipextoy. Sản phẩm dành cho người từ 18 tuổi trở lên.
      </div>
    </footer>
  );
}
