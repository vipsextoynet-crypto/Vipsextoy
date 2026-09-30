"use client";

import { useState } from "react";

export default function ContactForm() {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [message, setMessage] = useState("");
  const [company, setCompany] = useState(""); // honeypot, luon de trong

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, contact, message, company }),
      });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Gui khong thanh cong");
      }

      setSent(true);
    } catch {
      setError(
        "Gửi không thành công, vui lòng thử lại hoặc liên hệ trực tiếp qua hotline/Zalo bên dưới."
      );
    } finally {
      setLoading(false);
    }
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
          value={name}
          onChange={(e) => setName(e.target.value)}
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
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          className="w-full border border-line bg-surface px-4 py-3 text-ivory outline-none focus:border-gold"
          placeholder="ban@email.com"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm text-muted">Nội dung</label>
        <textarea
          required
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="min-h-[140px] w-full border border-line bg-surface px-4 py-3 text-ivory outline-none focus:border-gold"
          placeholder="Vipsextoy có thể giúp gì cho bạn?"
        />
      </div>

      {/* Bay bot spam: truong an voi nguoi that (CSS an), bot tu dong dien
          se bi loai o server. Khong dat type="hidden" de bot khong bo qua. */}
      <div className="absolute -left-[9999px]" aria-hidden="true">
        <label>
          Công ty
          <input
            tabIndex={-1}
            autoComplete="off"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
          />
        </label>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

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
