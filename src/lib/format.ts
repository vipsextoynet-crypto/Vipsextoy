// formatPrice dat o file rieng, KHONG nam trong @/data/products, de component
// chay o trinh duyet (Header, ProductCard...) khong keo theo ca file du lieu
// san pham (~8MB) vao JavaScript tai ve may khach.
export function formatPrice(price: number) {
  return price.toLocaleString("vi-VN") + "đ";
}
