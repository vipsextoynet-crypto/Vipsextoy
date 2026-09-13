import type { Metadata } from "next";
import Link from "next/link";
import {
  Search,
  ShoppingCart,
  ClipboardList,
  Wallet,
  PhoneCall,
  PackageCheck,
  ShieldCheck,
  Lock,
  Truck,
} from "lucide-react";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Hướng dẫn mua hàng",
  description:
    "Hướng dẫn đặt hàng từng bước tại Vipextoy: chọn sản phẩm, thêm vào giỏ, điền thông tin nhận hàng, thanh toán và nhận hàng kín đáo toàn quốc.",
  alternates: { canonical: "/huong-dan-mua-hang" },
};

const steps = [
  {
    icon: Search,
    title: "Bước 1 — Chọn sản phẩm",
    desc: "Dùng ô Tìm kiếm hoặc bấm vào từng Danh mục ở cột bên trái để xem sản phẩm. Bấm vào ảnh hoặc tên sản phẩm để xem mô tả, thông số và giá chi tiết trước khi quyết định.",
  },
  {
    icon: ShoppingCart,
    title: "Bước 2 — Thêm vào giỏ hàng",
    desc: "Trên trang sản phẩm, chọn số lượng rồi bấm nút Thêm vào giỏ hàng. Bạn có thể xem lại giỏ hàng bất cứ lúc nào bằng cách bấm vào biểu tượng giỏ hàng ở góc trên bên phải (hiện số lượng và tổng tiền tạm tính).",
  },
  {
    icon: ClipboardList,
    title: "Bước 3 — Điền thông tin nhận hàng",
    desc: "Nhập Họ tên, Số điện thoại và Địa chỉ nhận hàng đầy đủ, chính xác. Vỏ hộp giao hàng hoàn toàn trung lập, không in tên hay hình ảnh sản phẩm để đảm bảo sự riêng tư.",
  },
  {
    icon: Wallet,
    title: "Bước 4 — Chọn hình thức thanh toán",
    desc: "Chọn Thanh toán khi nhận hàng (COD) hoặc Chuyển khoản trước. Với đơn hàng COD, một số khu vực hỗ trợ kiểm tra hàng trước khi thanh toán.",
  },
  {
    icon: PhoneCall,
    title: "Bước 5 — Xác nhận đơn hàng",
    desc: <>Sau khi đặt hàng, nhân viên tư vấn sẽ gọi điện hoặc nhắn Zalo để xác nhận thông tin trong vòng vài giờ làm việc. Nếu cần hỗ trợ ngay, gọi hotline <a href={site.phoneHref} className="font-semibold text-gold">{site.phone}</a>.</>,
  },
  {
    icon: PackageCheck,
    title: "Bước 6 — Nhận hàng",
    desc: "Đơn hàng được đóng gói kín đáo và giao trong 2–4 ngày làm việc toàn quốc. Kiểm tra kiện hàng còn nguyên tem trước khi ký nhận.",
  },
];

const commitments = [
  { icon: Lock, text: "Đóng gói kín đáo, không lộ nội dung bên trong" },
  { icon: ShieldCheck, text: "Bảo hành 3 tháng nếu lỗi do nhà sản xuất" },
  { icon: Truck, text: "Giao hàng nhanh toàn quốc, hỗ trợ COD" },
];

export default function BuyingGuidePage() {
  return (
    <div className="mx-auto max-w-4xl px-5 py-14">
      <p className="text-xs uppercase tracking-wide text-gold">Hỗ trợ khách hàng</p>
      <h1 className="mt-2 font-serif text-3xl font-bold text-ivory md:text-4xl">
        Hướng dẫn mua hàng
      </h1>
      <p className="mt-4 max-w-2xl text-base font-medium leading-relaxed text-ivory">
        Chỉ mất vài phút để đặt hàng tại {site.name}. Làm theo 6 bước dưới đây —
        mỗi bước đều có hình minh hoạ để bạn dễ hình dung, kể cả khi đây là
        lần đầu bạn mua hàng online.
      </p>

      <ol className="mt-10 flex flex-col gap-6">
        {steps.map((step, i) => {
          const Icon = step.icon;
          return (
            <li
              key={step.title}
              className="flex gap-5 border border-line bg-surface p-5 sm:p-6"
            >
              <div className="flex shrink-0 flex-col items-center gap-2">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gold text-lg font-bold text-white">
                  {i + 1}
                </span>
                <Icon size={22} strokeWidth={1.6} className="text-gold" />
              </div>
              <div>
                <h2 className="font-serif text-lg font-bold text-ivory">
                  {step.title}
                </h2>
                <p className="mt-1.5 text-sm font-medium leading-relaxed text-ivory">
                  {step.desc}
                </p>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="mt-12 border border-line bg-surface2 p-6">
        <h2 className="font-serif text-lg font-bold text-ivory">
          Cam kết với khách hàng
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {commitments.map((c) => {
            const Icon = c.icon;
            return (
              <div key={c.text} className="flex items-start gap-3">
                <Icon size={20} strokeWidth={1.6} className="mt-0.5 shrink-0 text-gold" />
                <p className="text-sm font-semibold text-ivory">{c.text}</p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-10 flex flex-col items-start gap-3 border-t border-line pt-8 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-medium text-ivory">
          Còn thắc mắc? Đội ngũ tư vấn luôn sẵn sàng hỗ trợ bạn, hoàn toàn
          riêng tư và tế nhị.
        </p>
        <div className="flex gap-3">
          <a
            href={site.phoneHref}
            className="bg-gold px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-gold-dark"
          >
            Gọi {site.phone}
          </a>
          <Link
            href="/lien-he"
            className="border border-line px-5 py-2.5 text-sm font-semibold text-ivory transition hover:border-gold hover:text-gold"
          >
            Liên hệ
          </Link>
        </div>
      </div>
    </div>
  );
}
