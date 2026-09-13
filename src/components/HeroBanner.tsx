"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

// THAY BANNER THẬT Ở ĐÂY:
// Đổi mỗi "gradient" thành ảnh banner thật bằng next/image, ví dụ:
//   <Image src="/banners/banner-1.jpg" alt="Khuyến mãi tháng 9" fill priority className="object-cover" />
// Kích thước khuyến nghị: 1200x360px (tỉ lệ ~10:3), nén ảnh dưới 200KB để tải nhanh.
// "priority" chỉ đặt cho ẢNH ĐẦU TIÊN (banner luôn hiện ngay khi tải trang — đây là
// phần ảnh hưởng tới chỉ số LCP, quan trọng nhất cho SEO/tốc độ).
const SLIDES = [
  {
    title: "Ưu đãi tháng này",
    subtitle: "Giảm giá đến 30% cho sản phẩm mới về",
    href: "/shop",
    gradient: "linear-gradient(135deg, #E6007A, #FF6FA5)",
  },
  {
    title: "Hàng chính hãng Svakom, We-Vibe",
    subtitle: "Bảo hành quốc tế, giao hàng kín đáo toàn quốc",
    href: "/shop",
    gradient: "linear-gradient(135deg, #2196F3, #6EC6FF)",
  },
  {
    title: "Freeship nội thành đơn từ 500.000đ",
    subtitle: "Thanh toán khi nhận hàng (COD)",
    href: "/shop",
    gradient: "linear-gradient(135deg, #1A1A1A, #4B4B4B)",
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
            style={{ background: s.gradient }}
          >
            <h2 className="font-serif text-2xl sm:text-4xl">{s.title}</h2>
            <p className="text-sm text-white/90 sm:text-base">{s.subtitle}</p>
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
