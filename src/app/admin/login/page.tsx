"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/admin";

  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!password) {
      setError("Vui lòng nhập mật khẩu.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Đăng nhập thất bại.");
        setLoading(false);
        return;
      }

      router.push(next);
      router.refresh();
    } catch {
      setError("Có lỗi xảy ra, vui lòng thử lại.");
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-[70vh] items-center justify-center px-5 py-14">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm border border-line bg-surface p-6 sm:p-8"
      >
        <h1 className="mb-1 font-serif text-xl text-ivory">Đăng nhập quản trị</h1>
        <p className="mb-6 text-sm text-muted">Vipsextoy Admin</p>

        <label className="mb-1 block text-xs text-muted">Mật khẩu</label>
        <input
          type="password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-1 w-full border border-line bg-surface2 px-3 py-2 text-sm text-ivory outline-none focus:border-gold/50"
          placeholder="••••••••"
        />

        {error && <p className="mb-3 mt-2 text-xs text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="mt-4 w-full bg-cta py-2.5 text-sm font-medium tracking-wide text-white transition hover:opacity-90 disabled:opacity-60"
        >
          {loading ? "Đang đăng nhập..." : "Đăng nhập"}
        </button>
      </form>
    </main>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
