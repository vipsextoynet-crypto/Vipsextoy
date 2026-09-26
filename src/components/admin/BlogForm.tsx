"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BlogPost } from "@/data/blog";

const ICONS = ["wave", "orb", "petal", "spark", "curve", "drop", "ring", "bloom"] as const;

export default function BlogForm({
  mode,
  initial,
}: {
  mode: "create" | "edit";
  initial?: BlogPost;
}) {
  const router = useRouter();

  const [title, setTitle] = useState(initial?.title || "");
  const [excerpt, setExcerpt] = useState(initial?.excerpt || "");
  const [category, setCategory] = useState(initial?.category || "");
  const [content, setContent] = useState(initial?.content.join("\n") || "");
  const [icon, setIcon] = useState<typeof ICONS[number]>((initial?.icon as typeof ICONS[number]) || "wave");
  const [image, setImage] = useState(initial?.image || "");
  const [date, setDate] = useState(initial?.date || new Date().toISOString().slice(0, 10));

  const [error, setError] = useState("");
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess(null);

    const html = content.trim();

    if (!title.trim() || !excerpt.trim() || !category.trim() || !html) {
      setError("Vui lòng điền: tiêu đề, mô tả ngắn, danh mục, nội dung.");
      return;
    }

    setLoading(true);
    try {
      const url = mode === "create" ? "/api/admin/blog" : `/api/admin/blog/${initial!.slug}`;
      const method = mode === "create" ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          excerpt: excerpt.trim(),
          content: [html],
          category: category.trim(),
          icon,
          image: image.trim() || undefined,
          date,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Có lỗi xảy ra, vui lòng thử lại.");
        setLoading(false);
        return;
      }

      setSuccess(
        `Đã lưu nháp "${title}". Khi xong hết, vào trang quản trị bấm "Cập nhật lên web" để đăng lên website.`
      );

      if (mode === "create") {
        setTitle("");
        setExcerpt("");
        setCategory("");
        setContent("");
        setImage("");
      }
    } catch {
      setError("Không kết nối được tới server, vui lòng thử lại.");
    }
    setLoading(false);
  }

  async function handleDelete() {
    if (!initial) return;
    if (!confirm(`Xoá vĩnh viễn bài viết "${initial.title}"? Không thể khôi phục.`)) return;

    setDeleting(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/blog/${initial.slug}`, { method: "DELETE" });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Không xoá được, vui lòng thử lại.");
        setDeleting(false);
        return;
      }

      router.push("/admin/blog");
    } catch {
      setError("Không kết nối được tới server, vui lòng thử lại.");
      setDeleting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <Field label="Tiêu đề *">
        <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} />
      </Field>

      <Field label="Mô tả ngắn (hiện ở trang danh sách) *">
        <textarea
          value={excerpt}
          onChange={(e) => setExcerpt(e.target.value)}
          rows={2}
          className={inputCls}
        />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Danh mục *">
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Hướng dẫn, Về Vipsextoy, Góc chia sẻ..."
            className={inputCls}
          />
        </Field>
        <Field label="Ngày đăng">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={inputCls}
          />
        </Field>
      </div>

      <Field label="Nội dung * (dán trực tiếp mã HTML — thẻ h2, h3, p, ul, li, a...)">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={16}
          placeholder={`<p>Đoạn mở đầu...</p>\n<h2>Tiêu đề phụ</h2>\n<p>Nội dung...</p>\n<ul>\n  <li>Ý thứ nhất</li>\n  <li>Ý thứ hai</li>\n</ul>`}
          className={`${inputCls} font-mono text-xs`}
        />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Biểu tượng (khi chưa có ảnh)">
          <select
            value={icon}
            onChange={(e) => setIcon(e.target.value as typeof ICONS[number])}
            className={inputCls}
          >
            {ICONS.map((i) => (
              <option key={i} value={i}>
                {i}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Link ảnh minh hoạ (để trống nếu dùng biểu tượng)">
          <input
            value={image}
            onChange={(e) => setImage(e.target.value)}
            placeholder="/anhblog/ten-thu-muc/01.jpg"
            className={inputCls}
          />
          <span className="mt-1 block text-xs text-muted">
            Ảnh đặt trong public/anhblog/&lt;tên thư mục&gt;/ — nhập đúng đường dẫn bắt đầu bằng "/", khớp chính xác hoa/thường với tên thư mục thật.
          </span>
        </Field>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}
      {success && <p className="text-sm text-green-400">{success}</p>}

      <button
        type="submit"
        disabled={loading || deleting}
        className="mt-2 bg-cta py-3 text-sm font-medium tracking-wide text-white transition hover:opacity-90 disabled:opacity-60"
      >
        {loading ? "Đang lưu..." : mode === "create" ? "Đăng bài viết" : "Cập nhật"}
      </button>

      {mode === "edit" && (
        <button
          type="button"
          onClick={handleDelete}
          disabled={loading || deleting}
          className="text-sm text-red-400 underline hover:text-red-300 disabled:opacity-60"
        >
          {deleting ? "Đang xoá..." : "Xoá bài viết này"}
        </button>
      )}
    </form>
  );
}

const inputCls =
  "w-full border border-line bg-surface2 px-3 py-2 text-sm text-ivory outline-none focus:border-gold/50";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-muted">{label}</span>
      {children}
    </label>
  );
}
