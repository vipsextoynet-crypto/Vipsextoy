import type { Metadata } from "next";
import localFont from "next/font/local";
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

// Tu luu font trong may (khong goi qua Google Fonts luc build nua) - tranh
// loi "Failed to fetch Fraunces/Manrope" khi may build mat mang/bi chan.
// File that nam trong src/fonts/, ban dang co day du Manrope (4 muc:
// Regular/Medium/SemiBold/Bold) nhung Fraunces THIEU muc 500 (Medium) nen
// chi khai bao dung 2 muc co san (400 + 600) cho Fraunces.
const fraunces = localFont({
  src: [
    { path: "../fonts/Fraunces_72pt-Regular.ttf", weight: "400" },
    { path: "../fonts/Fraunces_72pt-SemiBold.ttf", weight: "600" },
  ],
  variable: "--font-fraunces",
  display: "swap",
});

const manrope = localFont({
  src: [
    { path: "../fonts/Manrope-Regular.ttf", weight: "400" },
    { path: "../fonts/Manrope-Medium.ttf", weight: "500" },
    { path: "../fonts/Manrope-SemiBold.ttf", weight: "600" },
    { path: "../fonts/Manrope-Bold.ttf", weight: "700" },
  ],
  variable: "--font-manrope",
  display: "swap",
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
