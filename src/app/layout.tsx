import type { Metadata } from "next";
import { Fraunces, Manrope } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/lib/cart-context";
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
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "vi_VN",
    url: site.url,
    siteName: site.name,
    title: `${site.name} — Cửa hàng chăm sóc cá nhân riêng tư`,
    description: site.description,
  },
  twitter: {
    card: "summary_large_image",
    title: `${site.name} — Cửa hàng chăm sóc cá nhân riêng tư`,
    description: site.description,
  },
  robots: {
    index: true,
    follow: true,
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
            name: site.name,
            url: site.url,
            logo: `${site.url}/favicon.ico`,
            description: site.description,
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
        <CartProvider>
          <AgeGate />
          <Header />
          <main>{children}</main>
          <Footer />
          <CartDrawer />
          <FloatingContact />
        </CartProvider>
      </body>
    </html>
  );
}
