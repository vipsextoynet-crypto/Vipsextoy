import type { Metadata } from "next";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Hướng dẫn mua hàng",
  description:
    "Hướng dẫn đặt hàng tại Vipsextoy: chọn sản phẩm, thanh toán, giao hàng kín đáo và chính sách đổi trả.",
  alternates: { canonical: "/huong-dan-mua-hang" },
};

const steps = [
  {
    title: "Chọn sản phẩm",
    text: "Duyệt theo danh mục ở menu hoặc dùng ô tìm kiếm để tìm đúng sản phẩm cần mua.",
  },
  {
    title: "Thêm vào giỏ hàng",
    text: "Bấm “Mua hàng” hoặc “Thêm vào giỏ hàng” trên trang sản phẩm. Có thể tiếp tục chọn thêm sản phẩm khác.",
  },
  {
    title: "Kiểm tra giỏ hàng",
    text: "Bấm icon giỏ hàng ở góc trên để xem lại số lượng, giá tiền trước khi đặt.",
  },
  {
    title: "Điền thông tin giao hàng",
    text: "Nhập họ tên, số điện thoại và địa chỉ nhận hàng tại trang Thanh toán.",
  },
  {
    title: "Chọn phương thức thanh toán",
    text: "Thanh toán khi nhận hàng (COD) hoặc chuyển khoản ngân hàng.",
  },
  {
    title: "Xác nhận đơn hàng",
    text: `Sau khi đặt, bạn sẽ nhận mã đơn hàng. Nhân viên sẽ gọi xác nhận qua số ${site.phone} trước khi giao.`,
  },
  {
    title: "Nhận hàng",
    text: "Đơn được đóng gói kín đáo, trung lập, giao trong 2–4 ngày làm việc toàn quốc.",
  },
];

export default function HuongDanMuaHangPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-14">
      <p className="text-xs uppercase tracking-wide text-gold">Hỗ trợ</p>
      <h1 className="mt-2 font-serif text-3xl text-ivory">
        Hướng dẫn mua hàng
      </h1>
      <p className="mt-3 text-muted">
        Chỉ mất vài bước để đặt hàng tại Vipsextoy — riêng tư, kín đáo và
        nhanh chóng.
      </p>

      <ol className="mt-10 flex flex-col gap-6">
        {steps.map((s, i) => (
          <li key={s.title} className="flex gap-4">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center bg-gold text-sm font-semibold text-white">
              {i + 1}
            </span>
            <div>
              <h2 className="text-base text-ivory">{s.title}</h2>
              <p className="mt-1 text-sm text-muted">{s.text}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-12 border border-line bg-surface2 p-6 text-sm text-muted">
        Cần tư vấn thêm trước khi đặt hàng? Gọi hoặc nhắn Zalo hotline{" "}
        <a href={site.phoneHref} className="font-semibold text-gold">
          {site.phone}
        </a>{" "}
        — hỗ trợ 8:00–21:00 tất cả các ngày trong tuần.
      </div>
    </div>
  );
}
