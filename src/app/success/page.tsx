import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string; pay?: string }>;
}) {
  const { order, pay } = await searchParams;
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-5 py-28 text-center">
      <CheckCircle2 size={48} className="text-gold" strokeWidth={1.3} />
      <h1 className="mt-6 font-serif text-3xl text-ivory">
        Đặt hàng thành công
      </h1>
      <p className="mt-3 text-muted">
        Cảm ơn bạn. Mã đơn hàng của bạn là{" "}
        <span className="text-gold">{order}</span>. Chúng tôi sẽ
        liên hệ để xác nhận và giao hàng kín đáo trong 2–4 ngày làm việc.
      </p>
      {pay === "bank" && (
        <p className="mt-3 text-sm text-muted">
          Shop sẽ đối chiếu khoản chuyển khoản (nội dung:{" "}
          <span className="text-gold">{order}</span>) và liên hệ xác nhận với bạn.
          Nếu bạn chưa chuyển khoản, vui lòng chuyển theo mã QR đã hiển thị hoặc gọi hotline.
        </p>
      )}
      <Link
        href="/shop"
        className="mt-8 border border-line px-7 py-3 text-sm text-ivory transition hover:border-gold"
      >
        Tiếp tục mua sắm
      </Link>
    </div>
  );
}
