"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

// THAY BANNER THẬT Ở ĐÂY:
// Bỏ ảnh vào thư mục public/banners/ (ví dụ public/banners/banner-1.jpg),
// rồi điền đường dẫn vào field "image" của slide tương ứng bên dưới.
// Kích thước khuyến nghị: 1600x600px (tỉ lệ ~8:3), nén ảnh dưới 300KB để tải nhanh.
// Định dạng .jpg, .png hoặc .webp. Nếu để trống "image", banner tự dùng màu
// gradient như hiện tại (không lỗi gì cả).
//
// href: đường dẫn khi khách bấm vào banner (vd "/danh-muc/duong-vat-gia-rung").
// KHÔNG được để trống "" - để trống sẽ bị Lighthouse báo lỗi "link không có
// tên/nhãn" (vì Link rỗng vừa không rõ trỏ đi đâu, vừa không có chữ nào cho
// trình đọc màn hình). Nếu chưa có trang muốn trỏ tới, cứ để "/shop".
//
// label: mô tả ngắn banner này dẫn tới đâu (vd "Xem chương trình khuyến mãi
// tháng này") - dùng làm tên cho trình đọc màn hình (aria-label), LUÔN cần
// có kể cả khi hasOwnText=true (ảnh đã có chữ sẵn nên không hiện title/
// subtitle, nhưng người dùng trình đọc màn hình vẫn cần biết bấm vào sẽ đi
// đâu).
//
// hasOwnText: đặt true nếu ẢNH ĐÃ CÓ SẴN chữ/thiết kế đầy đủ (như banner quảng
// cáo thiết kế rồi) — khi đó code sẽ KHÔNG phủ thêm lớp tối và KHÔNG in thêm
// chữ title/subtitle đè lên nữa, tránh ảnh bị xỉn màu không cần thiết. Để false
// (hoặc bỏ qua) nếu ảnh chỉ là ảnh nền trơn, cần chữ title/subtitle của code
// hiển thị đè lên trên.
const SLIDES = [
  {
    title: "",
    subtitle: "",
    href: "/shop",
    label: "Xem chương trình khuyến mãi banner 1",
    gradient: "",
    image: "/banners/banner-1.webp",
    hasOwnText: true,
  },
  {
    title: "",
    subtitle: "",
    href: "/shop",
    label: "Xem chương trình khuyến mãi banner 2",
    gradient: "",
    image: "/banners/banner-2.webp",
    hasOwnText: true,
  },
  {
    title: "",
    subtitle: "",
    href: "/shop",
    label: "Xem chương trình khuyến mãi banner 3",
    gradient: "",
    image: "/banners/banner-3.webp",
    hasOwnText: true,
  },
];

// /banners/banner-1.webp -> /banners/sm/banner-1.webp (ban 800px do
// scripts/make-thumbs.mjs tao, dung cho mobile).
const smallOf = (src: string) =>
  src.replace(/^\/banners\/([^/]+?)\.[A-Za-z0-9]+$/, "/banners/sm/$1.webp");

export default function HeroBanner() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setIndex((i) => (i + 1) % SLIDES.length), 4500);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="relative mx-auto max-w-6xl overflow-hidden border border-line px-5 sm:px-0">
      <div className="relative aspect-[16/6] w-full overflow-hidden sm:aspect-[3/1]">
        {SLIDES.map((s, i) => (
          <Link
            key={s.image}
            href={s.href}
            aria-label={s.label}
            className={`absolute inset-0 flex flex-col items-start justify-center gap-2 px-8 text-white transition-opacity duration-700 sm:px-16 ${
              i === index ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
            style={s.image ? undefined : { background: s.gradient }}
          >
            {s.image && (
              <>
                {/* Dung <img> thuong (khong phai next/image) vi anh dang de
                    unoptimized, next/image khong ho tro srcSet o che do do. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={s.image}
                  srcSet={`${smallOf(s.image)} 800w, ${s.image} 1300w`}
                  sizes="(min-width: 1024px) 1152px, 100vw"
                  alt={s.label}
                  width={1300}
                  height={488}
                  loading={i === 0 ? "eager" : "lazy"}
                  fetchPriority={i === 0 ? "high" : "auto"}
                  decoding="async"
                  className="absolute inset-0 h-full w-full object-cover"
                  onError={(e) => {
                    // Chua chay script tao ban nho -> quay ve anh goc, khong vo anh.
                    const img = e.currentTarget;
                    if (img.srcset) {
                      img.removeAttribute("srcset");
                      img.src = s.image;
                    }
                  }}
                />
                {!s.hasOwnText && <div className="absolute inset-0 bg-black/35" />}
              </>
            )}
            {!s.hasOwnText && (
              <>
                <h2 className="relative font-serif text-2xl sm:text-4xl">{s.title}</h2>
                <p className="relative text-sm text-white sm:text-base">{s.subtitle}</p>
              </>
            )}
          </Link>
        ))}
      </div>

      <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            aria-label={`Banner ${i + 1}`}
            onClick={() => setIndex(i)}
            className="flex h-6 w-6 items-center justify-center"
          >
            <span
              className={`h-2 w-2 rounded-full transition ${
                i === index ? "bg-white" : "bg-white/50"
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
