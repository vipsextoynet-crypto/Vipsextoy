import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Nen trang, trung tinh
        background: "#F4F4F6",
        surface: "#FFFFFF",
        surface2: "#F3F3F3",
        // Chu chinh (thay cho "ivory" cu, gio la mau chu toi tren nen sang)
        ivory: "#222222",
        muted: "#6B6B6B",
        line: "#E7E7E7",
        // Mau thuong hieu - do chinh xac tu anh chup man hinh tham chieu
        gold: "#D90960",        // hong/magenta thuong hieu (logo, gia, nut danh muc)
        "gold-dark": "#B8074F", // hover/active cua mau thuong hieu
        ink: "#1A1A1A",         // nen thanh header tren cung (gan den)
        blue: "#0095EB",        // nut "Mua hang"
        red: "#FF0000",         // dong chu "Lien he dat hang toan quoc"
        yellow: "#FFD400",      // so hotline (vang, de doc hon mau vang thuan tren nen den)
      },
      fontFamily: {
        serif: ["var(--font-fraunces)", "Georgia", "serif"],
        sans: ["var(--font-manrope)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
