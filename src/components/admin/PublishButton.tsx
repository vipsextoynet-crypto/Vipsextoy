"use client";

import { useCallback, useEffect, useState } from "react";

export default function PublishButton() {
  const [pending, setPending] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  const loadPending = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/publish", { cache: "no-store" });
      const data = await res.json();
      if (res.ok) setPending(data.pending ?? 0);
    } catch {
      /* bo qua: chi la thong tin phu */
    }
  }, []);

  useEffect(() => {
    loadPending();
  }, [loadPending]);

  async function handlePublish() {
    if (
      !window.confirm(
        "Đăng tất cả thay đổi đã lưu lên web?\n\nVercel sẽ build lại 1 lần, khoảng 1–2 phút sau web mới cập nhật."
      )
    ) {
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/publish", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setIsError(true);
        setMessage(data.error || "Không đăng được lên web.");
      } else {
        setIsError(false);
        setMessage("Đã gửi lên Vercel. Đợi khoảng 1–2 phút để web cập nhật.");
        setPending(0);
      }
    } catch {
      setIsError(true);
      setMessage("Lỗi kết nối, thử lại sau.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={handlePublish}
        disabled={busy}
        className="bg-cta px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
      >
        {busy
          ? "Đang gửi..."
          : pending && pending > 0
            ? `Cập nhật lên web (${pending} thay đổi chưa đăng)`
            : "Cập nhật lên web"}
      </button>
      {message && (
        <p className={`text-sm ${isError ? "text-red-400" : "text-muted"}`}>{message}</p>
      )}
    </div>
  );
}
