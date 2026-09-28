import type { Metadata } from "next";
import { Fraunces, Manrope } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/lib/cart-context";
import { SensitiveProvider } from "@/lib/sensitive-context";
import { site } from "@/lib/site";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import AgeGate from "@/components/AgeGate";
import JsonLd from "@/components/JsonLd";
import FloatingContact from "@/components/FloatingContact";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  weight: ["400", "500", "600"],
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  weight: ["400", "500", "600", "700"],
});

const defaultOgImage = {
  url: site.ogImage.url,
  width: site.ogImage.width,
  height: site.ogImage.height,
  alt: site.name,
};

// LUU Y: KHONG dat `alternates.canonical` o day. Metadata cua layout duoc
// cac trang con thua huong - dat canonical "/" o day se khien MOI trang
// khong tu khai canonical bi coi la ban trung cua trang chu. Moi trang tu
// khai canonical rieng (xem lib/seo.ts -> buildMetadata).
export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name} — Cửa hàng chăm sóc cá nhân riêng tư`,
    template: `%s | ${site.name}`,
  },
  description: site.description,
  keywords: [
    "chăm sóc cá nhân",
    "sản phẩm người lớn",
    "đồ chơi người lớn",
    "giao hàng kín đáo",
    "vipextoy",
  ],
  openGraph: {
    type: "website",
    locale: "vi_VN",
    url: site.url,
    siteName: site.name,
    title: `${site.name} — Cửa hàng chăm sóc cá nhân riêng tư`,
    description: site.description,
    images: [defaultOgImage],
  },
  twitter: {
    card: "summary_large_image",
    title: `${site.name} — Cửa hàng chăm sóc cá nhân riêng tư`,
    description: site.description,
    images: [defaultOgImage.url],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <body
        className={`${fraunces.variable} ${manrope.variable} font-sans antialiased`}
      >
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "Organization",
            "@id": `${site.url}/#organization`,
            name: site.name,
            url: site.url,
            logo: `${site.url}${site.logo}`,
            image: `${site.url}${site.logo}`,
            description: site.description,
            address: [
              {
                "@type": "PostalAddress",
                streetAddress: "4 Cao Xuân Dục, Phường 13",
                addressLocality: "Quận 8",
                addressRegion: "TP. Hồ Chí Minh",
                addressCountry: "VN",
              },
              {
                "@type": "PostalAddress",
                streetAddress: "Trung Hòa",
                addressLocality: "Cầu Giấy",
                addressRegion: "Hà Nội",
                addressCountry: "VN",
              },
            ],
            contactPoint: {
              "@type": "ContactPoint",
              telephone: site.phone,
              contactType: "customer service",
              email: site.email,
              areaServed: "VN",
              availableLanguage: "Vietnamese",
            },
            sameAs: [site.social.facebook, site.social.instagram],
          }}
        />
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "WebSite",
            "@id": `${site.url}/#website`,
            name: site.name,
            alternateName: ["vipsextoy.com"],
            url: site.url,
            inLanguage: "vi-VN",
            publisher: { "@id": `${site.url}/#organization` },
          }}
        />
        <CartProvider>
          <SensitiveProvider>
            <AgeGate />
            <Header />
            <main>{children}</main>
            <Footer />
            <CartDrawer />
            <FloatingContact />
          </SensitiveProvider>
        </CartProvider>
      </body>
    </html>
  );
}
