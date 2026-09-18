"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { categories, Product } from "@/data/products";

const ICONS = ["wave", "orb", "petal", "spark", "curve", "drop", "ring", "bloom"] as const;

export default function ProductForm({
  mode,
  initial,
}: {
  mode: "create" | "edit";
  initial?: Product;
}) {
  const router = useRouter();

  const [name, setName] = useState(initial?.name || "");
  const [sku, setSku] = useState(initial?.sku || "");
  const [categorySlug, setCategorySlug] = useState(initial?.categorySlug || categories[0]?.slug || "");
  const [price, setPrice] = useState(initial ? String(initial.price) : "");
  const [compareAt, setCompareAt] = useState(initial?.compareAt ? String(initial.compareAt) : "");
  const [blurb, setBlurb] = useState(initial?.blurb || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [features, setFeatures] = useState(initial?.features.join("\n") || "");
  const [icon, setIcon] = useState<typeof ICONS[number]>((initial?.icon as typeof ICONS[number]) || "wave");
  const [badge, setBadge] = useState(initial?.badge || "");
  const [image, setImage] = useState(initial?.image || "");
  const [images, setImages] = useState(initial?.images?.join(", ") || "");
  const [sensitive, setSensitive] = useState(initial?.sensitive || false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess(null);

    if (!name.trim() || !price || !description.trim()) {
      setError("Vui lòng điền: tên sản phẩm, giá bán, mô tả chi tiết.");
      return;
    }

    setLoading(true);
    try {
      const url = mode === "create" ? "/api/admin/products" : `/api/admin/products/${initial!.slug}`;
      const method = mode === "create" ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          sku: sku.trim() || undefined,
          categorySlug,
          price: Number(price),
          compareAt: compareAt ? Number(compareAt) : undefined,
          blurb: blurb.trim() || undefined,
          description: description.trim(),
          features: features
            .split("\n")
            .map((f) => f.trim())
            .filter(Boolean),
          icon,
          badge: badge.trim() || undefined,
          image: image.trim() || undefined,
          images: images
            .split(",")
            .map((u) => u.trim())
            .filter(Boolean),
          sensitive,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Có lỗi xảy ra, vui lòng thử lại.");
        setLoading(false);
        return;
      }

      setSuccess(
        `Đã lưu "${name}". Website sẽ cập nhật sau khi Vercel build lại xong (khoảng 1–2 phút).`
      );

      if (mode === "create") {
        setName("");
        setSku("");
        setPrice("");
        setCompareAt("");
        setBlurb("");
        setDescription("");
        setFeatures("");
        setBadge("");
        setImage("");
        setImages("");
        setSensitive(false);
      }
    } catch {
      setError("Không kết nối được tới server, vui lòng thử lại.");
    }
    setLoading(false);
  }

  async function handleDelete() {
    if (!initial) return;
    if (!confirm(`Xoá vĩnh viễn sản phẩm "${initial.name}"? Không thể khôi phục.`)) return;

    setDeleting(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/products/${initial.slug}`, { method: "DELETE" });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Không xoá được, vui lòng thử lại.");
        setDeleting(false);
        return;
      }

      router.push("/admin/products");
    } catch {
      setError("Không kết nối được tới server, vui lòng thử lại.");
      setDeleting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <Field label="Tên sản phẩm *">
        <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Mã SKU (để trống tự tạo)">
          <input value={sku} onChange={(e) => setSku(e.target.value)} className={inputCls} />
        </Field>
        <Field label="Danh mục *">
          <select
            value={categorySlug}
            onChange={(e) => setCategorySlug(e.target.value)}
            className={inputCls}
          >
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Giá bán (đ) *">
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="Giá cũ (đ, để trống nếu không có)">
          <input
            type="number"
            value={compareAt}
            onChange={(e) => setCompareAt(e.target.value)}
            className={inputCls}
          />
        </Field>
      </div>

      <Field label="Mô tả ngắn (hiện ở thẻ sản phẩm, để trống tự lấy từ mô tả chi tiết)">
        <input value={blurb} onChange={(e) => setBlurb(e.target.value)} className={inputCls} />
      </Field>

      <Field label="Mô tả chi tiết *">
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={6}
          className={inputCls}
        />
      </Field>

      <Field label="Đặc điểm nổi bật (mỗi dòng 1 đặc điểm)">
        <textarea
          value={features}
          onChange={(e) => setFeatures(e.target.value)}
          rows={4}
          placeholder={"Silicone y tế an toàn\nNhiều chế độ rung\nChống nước"}
          className={inputCls}
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
        <Field label="Nhãn (VD: Mới, Bán chạy — để trống nếu không có)">
          <input value={badge} onChange={(e) => setBadge(e.target.value)} className={inputCls} />
        </Field>
      </div>

      <Field label="Link ảnh chính">
        <input value={image} onChange={(e) => setImage(e.target.value)} className={inputCls} />
      </Field>

      <Field label="Link ảnh phụ (cách nhau bởi dấu phẩy)">
        <input value={images} onChange={(e) => setImages(e.target.value)} className={inputCls} />
      </Field>

      <label className="flex items-center gap-2 text-sm text-muted">
        <input
          type="checkbox"
          checked={sensitive}
          onChange={(e) => setSensitive(e.target.checked)}
        />
        Ảnh quá nhạy cảm — che 18+ ở trang chủ và trang danh mục
      </label>

      {error && <p className="text-sm text-red-400">{error}</p>}
      {success && <p className="text-sm text-green-400">{success}</p>}

      <button
        type="submit"
        disabled={loading || deleting}
        className="mt-2 bg-cta py-3 text-sm font-medium tracking-wide text-white transition hover:opacity-90 disabled:opacity-60"
      >
        {loading ? "Đang lưu..." : mode === "create" ? "Đăng sản phẩm" : "Cập nhật"}
      </button>

      {mode === "edit" && (
        <button
          type="button"
          onClick={handleDelete}
          disabled={loading || deleting}
          className="text-sm text-red-400 underline hover:text-red-300 disabled:opacity-60"
        >
          {deleting ? "Đang xoá..." : "Xoá sản phẩm này"}
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
