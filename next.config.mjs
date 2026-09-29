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

  // Cac slug danh muc CU da bi tach/doi ten khi lam lai cau truc menu
  // 2 tang. Redirect 301 sang danh muc moi gan nhat de khong mat index
  // Google, khong tao redirect chain (moi dong day chi redirect 1 lan).
  async redirects() {
    return [
      // Bỏ tiền tố /nhom/: /nhom/sextoy-cho-nam -> /sextoy-cho-nam
      // (giữ nguyên ?page=... nếu có). 301 để giữ thứ hạng Google.
      {
        source: "/nhom/:slug",
        destination: "/:slug",
        permanent: true,
      },
      {
        source: "/danh-muc/do-choi-cao-cap",
        destination: "/do-choi-cao-cap-nu",
        permanent: true,
      },
      {
        source: "/danh-muc/gel-boi-tron-cao-cap",
        destination: "/gel-boi-tron-am-dao",
        permanent: true,
      },
      {
        source: "/danh-muc/do-choi-cho-lgbt",
        destination: "/do-choi-cho-gay",
        permanent: true,
      },
      // Bỏ tiền tố /danh-muc/ cho MỌI danh mục: /danh-muc/x -> /x
      // (phải nằm SAU các rule slug cũ ở trên để chỉ redirect 1 lần).
      {
        source: "/danh-muc/:slug",
        destination: "/:slug",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;