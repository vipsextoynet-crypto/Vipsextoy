import Link from "next/link";

const links = [
  { href: "/chinh-sach/van-chuyen", label: "Vận chuyển" },
  { href: "/chinh-sach/doi-tra", label: "Đổi trả" },
  { href: "/chinh-sach/thanh-toan", label: "Thanh toán" },
  { href: "/chinh-sach/bao-mat", label: "Bảo mật" },
  { href: "/chinh-sach/dieu-khoan", label: "Điều khoản sử dụng" },
];

export default function PolicyLayout({
  title,
  updatedAt,
  children,
}: {
  title: string;
  updatedAt: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-6xl px-5 py-14">
      <div className="grid gap-12 md:grid-cols-[220px_1fr]">
        <aside className="flex flex-row flex-wrap gap-2 md:flex-col md:gap-1">
          <p className="mb-2 hidden text-xs uppercase tracking-wide text-muted md:block">
            Chính sách
          </p>
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="border border-line px-3 py-2 text-sm text-muted transition hover:border-gold/50 hover:text-ivory md:border-0 md:px-0 md:py-1.5"
            >
              {l.label}
            </Link>
          ))}
        </aside>

        <div className="max-w-2xl">
          <p className="text-xs uppercase tracking-wide text-gold">
            Chính sách
          </p>
          <h1 className="mt-2 font-serif text-3xl text-ivory">{title}</h1>
          <p className="mt-2 text-xs text-muted">Cập nhật lần cuối: {updatedAt}</p>
          <div className="mt-8 flex flex-col gap-5 text-sm leading-relaxed text-muted [&_h2]:mt-4 [&_h2]:font-serif [&_h2]:text-lg [&_h2]:text-ivory [&_ul]:flex [&_ul]:list-disc [&_ul]:flex-col [&_ul]:gap-2 [&_ul]:pl-5">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
