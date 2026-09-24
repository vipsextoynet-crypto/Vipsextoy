"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useCart } from "@/lib/cart-context";
import { formatPrice } from "@/data/products";
import ProductGlyph from "@/components/ProductGlyph";
import { bank, bankConfigured, vietQrUrl } from "@/lib/bank";

const SHIPPING_FEE = 30000;
// Tu 1.000.000d tro len duoc mien phi van chuyen.
const FREE_SHIP_THRESHOLD = 1000000;

function generateOrderId() {
  return `VX${Date.now().toString().slice(-8)}`;
}

export default function CheckoutPage() {
  const { items, subtotal, clear } = useCart();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [payment, setPayment] = useState<"cod" | "bank">("cod");
  const [form, setForm] = useState({
    name: "",
    phone: "",
    address: "",
    note: "",
  });
  const [error, setError] = useState<string | null>(null);

  // Buoc 2 (chi ap dung khi chon chuyen khoan VA bank.ts da cau hinh):
  // hien QR truoc, chi goi API that khi khach bam "Tôi đã chuyển khoản".
  const [bankStep, setBankStep] = useState(false);
  const [bankOrderId, setBankOrderId] = useState<string | null>(null);
  const [qrFailed, setQrFailed] = useState(false);

  const freeShip = subtotal >= FREE_SHIP_THRESHOLD;
  const shippingFee = items.length ? (freeShip ? 0 : SHIPPING_FEE) : 0;
  const total = items.length ? subtotal + shippingFee : 0;

  async function submitOrder(orderId?: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items,
          customer: form,
          payment,
          total,
          shippingFee,
          ...(orderId ? { orderId } : {}),
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.orderId) {
        throw new Error(data?.error || "Không thể đặt hàng, vui lòng thử lại.");
      }
      clear();
      router.push(`/success?order=${data.orderId}&pay=${payment}`);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Có lỗi xảy ra, vui lòng thử lại hoặc gọi hotline để được hỗ trợ."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (items.length === 0) return;

    if (payment === "bank" && bankConfigured) {
      // Chua goi API - chi tao ma don de hien QR. Chi thuc su gui don khi
      // khach bam "Tôi đã chuyển khoản" o man hinh sau.
      setError(null);
      setQrFailed(false);
      setBankOrderId(generateOrderId());
      setBankStep(true);
      return;
    }

    await submitOrder();
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-24 text-center">
        <p className="font-serif text-2xl text-ivory">Giỏ hàng đang trống</p>
        <p className="mt-2 text-muted">
          Hãy thêm sản phẩm vào giỏ trước khi thanh toán.
        </p>
      </div>
    );
  }

  // ===== Man hinh 2: QR chuyen khoan =====
  if (bankStep && bankOrderId) {
    const qrUrl = vietQrUrl(total, bankOrderId);

    return (
      <div className="mx-auto max-w-xl px-5 py-14">
        <button
          onClick={() => setBankStep(false)}
          className="mb-6 text-sm text-muted hover:text-ivory"
        >
          ← Quay lại
        </button>

        <h1 className="mb-2 font-serif text-2xl text-ivory">
          Quét mã để chuyển khoản
        </h1>
        <p className="mb-6 text-sm text-muted">
          Sau khi chuyển khoản xong, bấm nút bên dưới để gửi đơn hàng cho
          chúng tôi.
        </p>

        <div className="border border-line bg-surface p-6">
          {!qrFailed ? (
            <div className="flex justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrUrl}
                alt="Mã QR chuyển khoản"
                width={280}
                height={280}
                onError={() => setQrFailed(true)}
                className="bg-white p-2"
              />
            </div>
          ) : (
            <p className="text-center text-sm text-muted">
              Không tải được mã QR — vui lòng chuyển khoản thủ công theo
              thông tin bên dưới.
            </p>
          )}

          <div className="mt-6 flex flex-col gap-3 border-t border-line pt-5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted">Ngân hàng</span>
              <span className="text-ivory">{bank.bankLabel}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Số tài khoản</span>
              <span className="font-medium text-ivory">{bank.accountNo}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Chủ tài khoản</span>
              <span className="text-ivory">{bank.accountName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Số tiền</span>
              <span className="font-medium text-gold">{formatPrice(total)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Nội dung chuyển khoản</span>
              <span className="font-medium text-ivory">{bankOrderId}</span>
            </div>
          </div>

          <p className="mt-4 text-xs text-muted">
            Vui lòng chuyển đúng số tiền và giữ nguyên nội dung để đơn hàng
            được đối chiếu nhanh nhất.
          </p>
        </div>

        <button
          disabled={loading}
          onClick={() => submitOrder(bankOrderId)}
          className="mt-6 w-full bg-gold py-3.5 text-sm tracking-wide text-background transition hover:bg-ivory disabled:opacity-60"
        >
          {loading ? "Đang gửi..." : "Tôi đã chuyển khoản — Gửi đơn hàng"}
        </button>
        {error && (
          <p className="mt-3 text-center text-sm font-medium text-red">
            {error}
          </p>
        )}
      </div>
    );
  }

  // ===== Man hinh 1: form thong tin + chon phuong thuc =====
  return (
    <div className="mx-auto max-w-6xl px-5 py-14">
      <h1 className="mb-10 font-serif text-3xl text-ivory">Thanh toán</h1>

      <div className="grid gap-12 md:grid-cols-2">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div>
            <label className="mb-1 block text-sm text-muted">Họ và tên</label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full border border-line bg-surface px-4 py-3 text-ivory outline-none focus:border-gold"
              placeholder="Nguyễn Văn A"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-muted">
              Số điện thoại
            </label>
            <input
              required
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full border border-line bg-surface px-4 py-3 text-ivory outline-none focus:border-gold"
              placeholder="09xx xxx xxx"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-muted">
              Địa chỉ giao hàng
            </label>
            <textarea
              required
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="min-h-[90px] w-full border border-line bg-surface px-4 py-3 text-ivory outline-none focus:border-gold"
              placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-muted">
              Ghi chú (tuỳ chọn)
            </label>
            <input
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              className="w-full border border-line bg-surface px-4 py-3 text-ivory outline-none focus:border-gold"
              placeholder="Giao giờ hành chính, gọi trước khi giao..."
            />
          </div>

          <div>
            <p className="mb-2 text-sm text-muted">Phương thức thanh toán</p>
            <div className="flex flex-col gap-3">
              <label className="flex cursor-pointer items-center gap-3 border border-line px-4 py-3 has-[:checked]:border-gold">
                <input
                  type="radio"
                  name="payment"
                  checked={payment === "cod"}
                  onChange={() => setPayment("cod")}
                />
                <span className="text-sm text-ivory">
                  Thanh toán khi nhận hàng (COD)
                </span>
              </label>
              <label className="flex cursor-pointer items-center gap-3 border border-line px-4 py-3 has-[:checked]:border-gold">
                <input
                  type="radio"
                  name="payment"
                  checked={payment === "bank"}
                  onChange={() => setPayment("bank")}
                />
                <span className="text-sm text-ivory">
                  Chuyển khoản ngân hàng
                </span>
              </label>
            </div>
            {payment === "bank" && !bankConfigured && (
              <p className="mt-2 text-xs text-muted">
                Sau khi bấm "Đặt hàng", shop sẽ liên hệ gửi thông tin chuyển
                khoản.
              </p>
            )}
          </div>

          <button
            disabled={loading}
            className="mt-4 bg-gold py-3.5 text-sm tracking-wide text-background transition hover:bg-ivory disabled:opacity-60"
          >
            {loading
              ? "Đang xử lý..."
              : payment === "bank" && bankConfigured
              ? `Tiếp tục — ${formatPrice(total)}`
              : `Đặt hàng — ${formatPrice(total)}`}
          </button>
          {error && (
            <p className="text-center text-sm font-medium text-red">
              {error}
            </p>
          )}
          <p className="text-center text-xs text-muted">
            Đơn hàng của bạn được đóng gói kín đáo, không thể hiện nội dung
            bên ngoài.
          </p>
        </form>

        <div className="h-fit border border-line bg-surface p-6">
          <p className="mb-5 font-serif text-lg text-ivory">Đơn hàng</p>
          <ul className="flex flex-col gap-4">
            {items.map((item) => (
              <li key={item.slug} className="flex items-center gap-3">
                <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden bg-surface2 p-2.5">
                  {item.image ? (
                    <Image
                      src={item.image}
                      alt={item.name}
                      fill
                      sizes="48px"
                      className="object-contain p-1"
                    />
                  ) : (
                    <ProductGlyph type={item.icon} />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-ivory">{item.name}</p>
                  <p className="text-xs text-muted">SL: {item.qty}</p>
                </div>
                <span className="text-sm text-ivory">
                  {formatPrice(item.price * item.qty)}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-6 flex flex-col gap-2 border-t border-line pt-5 text-sm">
            <div className="flex justify-between text-muted">
              <span>Tạm tính</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            <div className="flex justify-between text-muted">
              <span>Phí vận chuyển</span>
              {freeShip ? (
                <span className="flex items-center gap-2">
                  <span className="text-muted line-through">{formatPrice(SHIPPING_FEE)}</span>
                  <span className="text-gold">Miễn phí</span>
                </span>
              ) : (
                <span>{formatPrice(SHIPPING_FEE)}</span>
              )}
            </div>
            {!freeShip && (
              <p className="text-xs text-muted">
                Miễn phí vận chuyển cho đơn từ {formatPrice(FREE_SHIP_THRESHOLD)}.
              </p>
            )}
            <div className="flex justify-between pt-2 text-base text-ivory">
              <span>Tổng cộng</span>
              <span className="text-gold">{formatPrice(total)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
