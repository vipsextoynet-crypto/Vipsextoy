import Image from "next/image";
import { getOrders } from "@/lib/orders";
import { formatPrice } from "@/data/products";

// Luôn đọc lại file mới nhất, không cache trang này.
export const dynamic = "force-dynamic";

export default function AdminOrdersPage() {
  const orders = getOrders();

  return (
    <main className="mx-auto max-w-5xl px-5 py-14">
      <h1 className="mb-2 font-serif text-2xl text-ivory">
        Đơn hàng ({orders.length})
      </h1>
      <p className="mb-8 text-sm text-muted">
        Trang này chỉ bạn xem được (yêu cầu đăng nhập). Đơn mới nhất hiển thị trước.
      </p>

      {orders.length === 0 && (
        <p className="text-muted">Chưa có đơn hàng nào.</p>
      )}

      <div className="flex flex-col gap-4">
        {orders.map((o) => (
          <div key={o.orderId} className="border border-line bg-surface p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-serif text-lg text-ivory">#{o.orderId}</p>
              <p className="text-xs text-muted">
                {new Date(o.createdAt).toLocaleString("vi-VN")}
              </p>
            </div>

            <div className="mt-3 grid gap-1 text-sm text-muted">
              <p>
                <span className="text-ivory">Khách:</span> {o.customer.name} —{" "}
                {o.customer.phone}
              </p>
              <p>
                <span className="text-ivory">Địa chỉ:</span>{" "}
                {o.customer.address}
              </p>
              {o.customer.note && (
                <p>
                  <span className="text-ivory">Ghi chú:</span> {o.customer.note}
                </p>
              )}
              <p>
                <span className="text-ivory">Thanh toán:</span>{" "}
                {o.payment === "cod" ? "Thanh toán khi nhận hàng (COD)" : "Chuyển khoản ngân hàng"}
              </p>
            </div>

            <ul className="mt-4 flex flex-col gap-2 border-t border-line pt-3 text-sm">
              {o.items.map((it, i) => (
                <li key={i} className="flex items-center justify-between gap-3 text-muted">
                  <div className="flex items-center gap-3">
                    {it.image && (
                      <div className="relative h-10 w-10 shrink-0 overflow-hidden bg-surface2">
                        <Image src={it.image} alt={it.name} fill sizes="40px" className="object-contain" />
                      </div>
                    )}
                    <span>
                      {it.name} × {it.qty}
                    </span>
                  </div>
                  <span>{formatPrice(it.price * it.qty)}</span>
                </li>
              ))}
            </ul>

            <div className="mt-3 flex justify-between border-t border-line pt-3 text-sm">
              <span className="text-ivory">Tổng cộng</span>
              <span className="text-gold">{formatPrice(o.total)}</span>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
