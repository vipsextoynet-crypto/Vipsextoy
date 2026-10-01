import Link from "next/link";
import Image from "next/image";
import { getGroups, getProductsByGroup } from "@/lib/groups";
import { smallThumb } from "@/lib/thumb";

// Ô tròn danh mục cha, 3 ô / hàng. Chỉ dùng cho mobile ở trang chủ
// (desktop dùng Sidebar). Ảnh trong ô lấy từ sản phẩm đầu tiên của nhóm.
export default function CategoryCircles() {
  const groups = getGroups();

  return (
    <nav aria-label="Danh mục sản phẩm" className="grid grid-cols-3 gap-x-3 gap-y-5">
      {groups.map((g) => {
        const first = getProductsByGroup(g.items)[0];
        // Uu tien anh 260px (scripts/make-thumbs.mjs), roi thumbnail, roi anh goc.
        const img =
          smallThumb(first?.thumb) ?? first?.thumb ?? first?.image ?? first?.images?.[0];
        return (
          <Link
            key={g.slug}
            href={
              g.items.length === 1
                ? `/${g.items[0].slug}`
                : `/${g.slug}`
            }
            className="group flex flex-col items-center gap-2 text-center"
          >
            <span className="relative block h-20 w-20 overflow-hidden rounded-full border-2 border-gold/40 bg-surface2 transition group-active:scale-95">
              {img ? (
                <Image
                  src={img}
                  alt=""
                  fill
                  sizes="80px"
                  unoptimized={false}
                  className="object-cover"
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center font-serif text-2xl text-gold">
                  {g.name.charAt(0)}
                </span>
              )}
            </span>
            <span className="line-clamp-2 text-xs font-semibold capitalize leading-tight text-ivory">
              {g.name}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
