import Link from "next/link";
import LogoutButton from "@/components/admin/LogoutButton";
import PublishButton from "@/components/admin/PublishButton";

export const dynamic = "force-dynamic";

export default function AdminHomePage() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-14">
      <h1 className="mb-2 font-serif text-2xl text-ivory">Trang quản trị</h1>
      <p className="mb-8 text-sm text-muted">Vipsextoy Admin</p>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/admin/products"
          className="block border border-line bg-surface p-5 transition hover:border-gold/50"
        >
          <h2 className="mb-1 font-serif text-lg text-ivory">Tất cả sản phẩm</h2>
          <p className="text-sm text-muted">Xem, sửa, xoá hoặc thêm sản phẩm mới.</p>
        </Link>

        <Link
          href="/admin/orders"
          className="block border border-line bg-surface p-5 transition hover:border-gold/50"
        >
          <h2 className="mb-1 font-serif text-lg text-ivory">Đơn hàng</h2>
          <p className="text-sm text-muted">Xem các đơn hàng khách đã đặt.</p>
        </Link>

        <Link
          href="/admin/blog"
          className="block border border-line bg-surface p-5 transition hover:border-gold/50"
        >
          <h2 className="mb-1 font-serif text-lg text-ivory">Blog</h2>
          <p className="text-sm text-muted">Viết, sửa, xoá bài viết blog thủ công.</p>
        </Link>
      </div>

      <div className="mt-8 border border-line bg-surface p-5">
        <h2 className="mb-1 font-serif text-lg text-ivory">Đăng lên web</h2>
        <p className="mb-4 text-sm text-muted">
          Thêm/sửa/xoá sản phẩm hoặc bài viết chỉ được lưu nháp. Bấm nút dưới khi đã xong để web cập nhật một lần.
        </p>
        <PublishButton />
      </div>

      <div className="mt-10">
        <LogoutButton />
      </div>
    </main>
  );
}
