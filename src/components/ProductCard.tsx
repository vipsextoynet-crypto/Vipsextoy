import type { Product } from "@/data/products";
import ProductCardClient from "./ProductCardClient";

// Component SERVER: cat gon san pham xuong con cac truong card can roi moi
// chuyen cho ProductCardClient (component chay o trinh duyet). Nho vay HTML/RSC
// cua trang chu, danh muc, shop khong con chua mo ta dai cua tung san pham.
// Cac trang goi <ProductCard product={p} /> nhu cu, khong can sua.
export default function ProductCard({
  product,
  priority = false,
}: {
  product: Product;
  priority?: boolean;
}) {
  const { slug, name, price, compareAt, image, thumb, icon, badge, sensitive } = product;
  return (
    <ProductCardClient
      product={{ slug, name, price, compareAt, image, thumb, icon, badge, sensitive }}
      priority={priority}
    />
  );
}
