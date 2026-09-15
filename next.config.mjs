/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Anh san pham dang tro truc tiep ve domain nguon - cho phep Next.js
    // toi uu (resize, nen WebP/AVIF, lazy-load) de tang toc do tai trang.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "vipsextoy.net",
      },
    ],
    formats: ["image/avif", "image/webp"],
  },
  compress: true,
  experimental: {
    // Next.js 16.3 bat mac dinh Turbopack filesystem cache cho `next build`.
    // Tinh nang nay dang co bug tren Windows, gay crash "os error 1450"
    // (het tai nguyen he thong) khi build local. Tat cache nay di —
    // build se cham hon vai giay nhung on dinh, khong anh huong ket qua build.
    // Xem: https://nextjs.org/docs/app/api-reference/config/next-config-js/turbopackFileSystemCache
    turbopackFileSystemCacheForBuild: false,
  },
};

export default nextConfig;
