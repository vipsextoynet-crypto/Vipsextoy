import Image from "next/image";
import Link from "next/link";
import { Lock, Truck, ShieldCheck } from "lucide-react";

/**
 * O banner chinh cua trang chu.
 *
 * Mac dinh (khong truyen `src`): hien banner quang cao duoc dung bang code
 * (gradient + chu + icon) thay vi anh chup - luon net cang trong moi kich
 * thuoc man hinh, tai tuc thi (khong co file anh nao phai tai ve), va dung
 * dung ty le 1600x500 (aspect-[16/5]) nhu khuyen nghi.
 *
 * Khi da co anh/GIF banner rieng: truyen `src` (vd anh khuyen mai theo mua),
 * banner se chuyen sang dung next/image (tu dong nen WebP/AVIF + resize) voi
 * `priority` de toi uu LCP - kich thuoc khung giu nguyen nen khong bi giat
 * layout (CLS) khi chuyen doi.
 */
export default function Banner({
  src,
  alt = "Banner khuyến mãi Vipsextoy",
}: {
  src?: string;
  alt?: string;
}) {
  if (src) {
    return (
      <div className="relative aspect-[16/5] w-full overflow-hidden bg-surface2">
        <Image
          src={src}
          alt={alt}
          fill
          priority
          sizes="(max-width: 1152px) 100vw, 1152px"
          className="object-cover"
        />
      </div>
    );
  }

  return (
    <Link
      href="/shop"
      className="group relative flex aspect-[16/5] w-full items-center overflow-hidden bg-ink"
    >
      {/* Hoa tiet trang tri - hinh tron mo, khong dung anh chup nen khong co
          rui ro noi dung, tai nhe (thuan CSS, khong tai file nao). */}
      <div className="pointer-events-none absolute -left-16 -top-16 h-56 w-56 rounded-full bg-gold/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 right-10 h-64 w-64 rounded-full bg-gold/20 blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-0 hidden h-full w-1/3 bg-gradient-to-l from-gold/25 to-transparent sm:block" />

      <div className="relative z-10 flex w-full flex-col gap-3 px-6 sm:px-10 md:gap-4 md:px-16">
        <span className="w-fit bg-gold px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white sm:text-xs">
          Ưu đãi tuần này
        </span>
        <h2 className="max-w-lg font-serif text-2xl font-bold uppercase leading-tight text-white sm:text-3xl md:text-4xl">
          Giảm đến 10% <span className="text-gold">*</span> toàn bộ sản phẩm
        </h2>
        <p className="max-w-md text-xs font-medium text-white/80 sm:text-sm">
          Đóng gói kín đáo · Giao nhanh toàn quốc · Bảo hành chính hãng
        </p>
        <span className="mt-1 w-fit bg-gold px-5 py-2.5 text-xs font-bold uppercase tracking-wide text-white transition group-hover:bg-gold-dark sm:text-sm">
          Mua ngay →
        </span>

        <div className="mt-2 hidden gap-5 sm:flex">
          <span className="flex items-center gap-1.5 text-[11px] font-semibold text-white/70">
            <Lock size={13} /> Riêng tư 100%
          </span>
          <span className="flex items-center gap-1.5 text-[11px] font-semibold text-white/70">
            <Truck size={13} /> Giao 2–4 ngày
          </span>
          <span className="flex items-center gap-1.5 text-[11px] font-semibold text-white/70">
            <ShieldCheck size={13} /> Bảo hành 3 tháng
          </span>
        </div>
      </div>
    </Link>
  );
}
