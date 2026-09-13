import Link from "next/link";

export default function Pagination({
  basePath,
  currentPage,
  totalPages,
}: {
  basePath: string;
  currentPage: number;
  totalPages: number;
}) {
  if (totalPages <= 1) return null;

  const pages: number[] = [];
  const start = Math.max(1, currentPage - 2);
  const end = Math.min(totalPages, currentPage + 2);
  for (let i = start; i <= end; i++) pages.push(i);

  function href(p: number) {
    return p <= 1 ? basePath : `${basePath}?page=${p}`;
  }

  return (
    <nav className="mt-12 flex flex-wrap items-center justify-center gap-2 text-sm">
      <Link
        href={href(Math.max(1, currentPage - 1))}
        aria-disabled={currentPage === 1}
        className={`border border-line px-3 py-2 ${
          currentPage === 1
            ? "pointer-events-none text-muted/40"
            : "text-muted hover:border-gold/50"
        }`}
      >
        ← Trước
      </Link>

      {start > 1 && <span className="px-2 text-muted">…</span>}

      {pages.map((p) => (
        <Link
          key={p}
          href={href(p)}
          className={`border px-3 py-2 ${
            p === currentPage
              ? "border-gold text-gold"
              : "border-line text-muted hover:border-gold/50"
          }`}
        >
          {p}
        </Link>
      ))}

      {end < totalPages && <span className="px-2 text-muted">…</span>}

      <Link
        href={href(Math.min(totalPages, currentPage + 1))}
        aria-disabled={currentPage === totalPages}
        className={`border border-line px-3 py-2 ${
          currentPage === totalPages
            ? "pointer-events-none text-muted/40"
            : "text-muted hover:border-gold/50"
        }`}
      >
        Sau →
      </Link>
    </nav>
  );
}
