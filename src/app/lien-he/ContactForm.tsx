"use client";

import { useState } from "react";

export default function ContactForm() {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    // NOTE: wire this up to a real email/CRM integration before going live.
    setTimeout(() => {
      setLoading(false);
      setSent(true);
    }, 600);
  }

  if (sent) {
    return (
      <div className="flex flex-col items-start gap-3 border border-line bg-surface p-8">
        <p className="font-serif text-xl text-ivory">Đã gửi thành công</p>
        <p className="text-sm text-muted">
          Cảm ơn bạn đã liên hệ. Đội ngũ Vipsextoy sẽ phản hồi trong vòng 24
          giờ làm việc, thông tin của bạn được bảo mật tuyệt đối.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div>
        <label className="mb-1 block text-sm text-muted">Họ và tên</label>
        <input
          required
          className="w-full border border-line bg-surface px-4 py-3 text-ivory outline-none focus:border-gold"
          placeholder="Nguyễn Văn A"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm text-muted">
          Email hoặc số điện thoại
        </label>
        <input
          required
          className="w-full border border-line bg-surface px-4 py-3 text-ivory outline-none focus:border-gold"
          placeholder="ban@email.com"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm text-muted">Nội dung</label>
        <textarea
          required
          className="min-h-[140px] w-full border border-line bg-surface px-4 py-3 text-ivory outline-none focus:border-gold"
          placeholder="Vipsextoy có thể giúp gì cho bạn?"
        />
      </div>
      <button
        disabled={loading}
        className="mt-2 bg-gold py-3 text-sm tracking-wide text-background transition hover:bg-ivory disabled:opacity-60"
      >
        {loading ? "Đang gửi..." : "Gửi liên hệ"}
      </button>
      <p className="text-xs text-muted">
        Thông tin bạn cung cấp chỉ được dùng để phản hồi yêu cầu, không chia
        sẻ cho bên thứ ba.
      </p>
    </form>
  );
}
