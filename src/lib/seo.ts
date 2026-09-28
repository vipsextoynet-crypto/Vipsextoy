import type { Metadata } from "next";
import { site } from "@/lib/site";

// Doi duong dan tuong doi ("/abc.jpg") thanh URL day du. URL da day du
// (bat dau bang http) thi giu nguyen.
export function absoluteUrl(pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return `${site.url}${pathOrUrl.startsWith("/") ? "" : "/"}${pathOrUrl}`;
}

type BuildMetadataInput = {
  // Khong can them "| Vipsextoy" - layout tu them qua title.template.
  title: string;
  description: string;
  // Duong dan cua trang, co dau / o dau. Vd "/blog", "/danh-muc/abc".
  path: string;
  // Anh rieng cua trang (vd anh san pham). Bo trong thi dung site.ogImage.
  image?: string;
};

// Tao metadata day du va NHAT QUAN cho 1 trang: canonical + Open Graph +
// Twitter. Ly do can helper: khi 1 trang tu khai bao openGraph/twitter thi
// Next.js THAY THE HOAN TOAN (khong gop) phan cua layout - neu khong khai
// bao lai images/url o day thi trang do mat anh chia se.
export function buildMetadata({
  title,
  description,
  path,
  image,
}: BuildMetadataInput): Metadata {
  const fullTitle = `${title} | ${site.name}`;
  const imageEntry = image
    ? { url: absoluteUrl(image), alt: title }
    : {
        url: absoluteUrl(site.ogImage.url),
        width: site.ogImage.width,
        height: site.ogImage.height,
        alt: site.name,
      };

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      locale: "vi_VN",
      url: absoluteUrl(path),
      siteName: site.name,
      title: fullTitle,
      description,
      images: [imageEntry],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: [imageEntry.url],
    },
  };
}
