import type { Metadata } from "next";
import { ShieldCheck, Package, HeartHandshake, Truck } from "lucide-react";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Giới thiệu",
  description:
    "Vipsextoy là cửa hàng sản phẩm chăm sóc cá nhân dành cho người trưởng thành, cam kết chất lượng, riêng tư và giao hàng kín đáo toàn quốc.",
  alternates: { canonical: "/gioi-thieu" },
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-4xl px-5 py-16">
      <p className="text-xs uppercase tracking-wide text-gold">Giới thiệu</p>
      <h1 className="mt-2 font-serif text-3xl text-ivory md:text-4xl">
        Chăm sóc bản thân là một điều bình thường và xứng đáng
      </h1>
      <p className="mt-6 max-w-2xl leading-relaxed text-muted">
        {site.name} ra đời với mong muốn mang đến cho khách hàng Việt Nam
        những sản phẩm chăm sóc cá nhân chất lượng cao, an toàn và một trải
        nghiệm mua sắm hoàn toàn riêng tư — từ lúc đặt hàng đến khi nhận
        hàng tại nhà.
      </p>
      <p className="mt-4 max-w-2xl leading-relaxed text-muted">
        Chúng tôi tin rằng việc chăm sóc bản thân không nên đi kèm sự ngại
        ngùng. Vì vậy, mọi khâu trong quy trình của {site.name} — từ tuyển
        chọn sản phẩm, tư vấn, đóng gói đến giao hàng — đều được thiết kế để
        bạn cảm thấy thoải mái và được tôn trọng tuyệt đối.
      </p>

      <div className="mt-14 grid gap-6 sm:grid-cols-2">
        <div className="flex gap-4 border border-line bg-surface p-6">
          <ShieldCheck size={22} strokeWidth={1.3} className="mt-1 shrink-0 text-gold" />
          <div>
            <p className="text-sm text-ivory">Chất lượng được kiểm định</p>
            <p className="mt-1 text-sm text-muted">
              Sản phẩm từ các thương hiệu uy tín, chất liệu an toàn, đạt tiêu
              chuẩn cho làn da nhạy cảm.
            </p>
          </div>
        </div>
        <div className="flex gap-4 border border-line bg-surface p-6">
          <Package size={22} strokeWidth={1.3} className="mt-1 shrink-0 text-gold" />
          <div>
            <p className="text-sm text-ivory">Riêng tư tuyệt đối</p>
            <p className="mt-1 text-sm text-muted">
              Đóng gói trung lập, tên người gửi và nội dung giao dịch đều
              được hiển thị kín đáo.
            </p>
          </div>
        </div>
        <div className="flex gap-4 border border-line bg-surface p-6">
          <Truck size={22} strokeWidth={1.3} className="mt-1 shrink-0 text-gold" />
          <div>
            <p className="text-sm text-ivory">Giao hàng toàn quốc</p>
            <p className="mt-1 text-sm text-muted">
              Giao nhanh 2–4 ngày làm việc, hỗ trợ kiểm tra hàng trước khi
              thanh toán tại nhiều khu vực.
            </p>
          </div>
        </div>
        <div className="flex gap-4 border border-line bg-surface p-6">
          <HeartHandshake size={22} strokeWidth={1.3} className="mt-1 shrink-0 text-gold" />
          <div>
            <p className="text-sm text-ivory">Tư vấn tận tâm</p>
            <p className="mt-1 text-sm text-muted">
              Đội ngũ tư vấn tinh tế, sẵn sàng hỗ trợ bạn chọn sản phẩm phù
              hợp mà không phán xét.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
