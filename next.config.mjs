/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Anh san pham hien dang duoc host tren domain nguon (vipsextoy.net).
    // Khai bao remotePatterns de next/image co the toi uu (resize, nen WebP/AVIF,
    // lazy-load) thay vi tra ve nguyen file goc qua the <img> thuong.
    // Khuyen nghi: ve lau dai nen tai anh san pham ve luu tren server/CDN cua
    // chinh minh (vd Cloudinary, S3, hoac /public) de khong phu thuoc uptime
    // cua domain khac va tranh trung noi dung anh voi website goc khi lam SEO.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "vipsextoy.net",
        pathname: "/files/**",
      },
    ],
    formats: ["image/avif", "image/webp"],
  },
  compress: true,
};

export default nextConfig;
