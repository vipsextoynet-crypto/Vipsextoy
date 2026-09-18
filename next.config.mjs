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
};

export default nextConfig;
