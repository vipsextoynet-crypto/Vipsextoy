/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Anh san pham dang tro truc tiep ve domain nguon - cho phep Next.js
    // toi uu (resize, nen WebP/AVIF, lazy-load) de tang toc do tai trang.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "vipsextoy.com",
      },
      {
        // Anh upload qua trang admin (Vercel Blob) - domain dang *.public.blob.vercel-storage.com
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
    ],
    formats: ["image/avif", "image/webp"],
    // TAT tinh nang toi uu anh cua Vercel: gan 1.900 san pham vuot han
    // muc mien phi (~1.000 luot toi uu/thang), Vercel tra ve loi 402 va
    // chan toan bo anh. Anh van hien binh thuong, chi khong duoc Vercel
    // resize/nen lai nua (nhieu anh da duoc nen san bang scripts/compress-images.mjs).
    unoptimized: true,
  },
  compress: true,
};

export default nextConfig;