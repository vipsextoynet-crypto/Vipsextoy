"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";

// THAY BANNER THẬT Ở ĐÂY:
// Bỏ ảnh vào thư mục public/banners/ (ví dụ public/banners/banner-1.jpg),
// rồi điền đường dẫn vào field "image" của slide tương ứng bên dưới.
// Kích thước khuyến nghị: 1600x600px (tỉ lệ ~8:3), nén ảnh dưới 300KB để tải nhanh.
// Định dạng .jpg, .png hoặc .webp. Nếu để trống "image", banner tự dùng màu
// gradient như hiện tại (không lỗi gì cả).
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
    href: "",
    gradient: "",
    image: "/banners/banner-1.png",
    hasOwnText: true,
  },
  {
    title: "",
    subtitle: "",
    href: "",
    gradient: "",
    image: "/banners/banner-2.png",
    hasOwnText: true,
  },
  {
    title: "",
    subtitle: "",
    href: "",
    gradient: "",
    image: "/banners/banner-3.png",
    hasOwnText: true,
  },
];

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
            key={s.title}
            href={s.href}
            className={`absolute inset-0 flex flex-col items-start justify-center gap-2 px-8 text-white transition-opacity duration-700 sm:px-16 ${
              i === index ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
            style={s.image ? undefined : { background: s.gradient }}
          >
            {s.image && (
              <>
                <Image
                  src={s.image}
                  alt={s.title}
                  fill
                  priority={i === 0}
                  className="object-cover"
                  sizes="(min-width: 1024px) 1152px, 100vw"
                />
                {!s.hasOwnText && <div className="absolute inset-0 bg-black/35" />}
              </>
            )}
            {!s.hasOwnText && (
              <>
                <h2 className="relative font-serif text-2xl sm:text-4xl">{s.title}</h2>
                <p className="relative text-sm text-white/90 sm:text-base">{s.subtitle}</p>
              </>
            )}
          </Link>
        ))}
      </div>

      <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-2">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            aria-label={`Banner ${i + 1}`}
            onClick={() => setIndex(i)}
            className={`h-2 w-2 rounded-full transition ${
              i === index ? "bg-white" : "bg-white/50"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
