import type { Metadata } from "next";
import PolicyLayout from "@/components/PolicyLayout";

export const metadata: Metadata = {
  title: "Chính sách thanh toán",
  description:
    "Chính sách thanh toán tại Vipextoy: các phương thức thanh toán hỗ trợ, bảo mật giao dịch và hiển thị trung lập trên sao kê ngân hàng.",
  alternates: { canonical: "/chinh-sach/thanh-toan" },
};

export default function PaymentPolicyPage() {
  return (
    <PolicyLayout title="Chính sách thanh toán" updatedAt="01/09/2026">
      <p>
        Vipextoy hỗ trợ nhiều phương thức thanh toán linh hoạt, đảm bảo an
        toàn và riêng tư cho mọi giao dịch.
      </p>
      <h2>Phương thức thanh toán</h2>
      <ul>
        <li>Thanh toán khi nhận hàng (COD) tại hầu hết khu vực toàn quốc.</li>
        <li>Chuyển khoản ngân hàng nội địa.</li>
        <li>Ví điện tử và thẻ nội địa/quốc tế (sắp ra mắt).</li>
      </ul>
      <h2>Hiển thị giao dịch trung lập</h2>
      <p>
        Với thanh toán chuyển khoản hoặc thẻ, nội dung giao dịch hiển thị
        trên sao kê ngân hàng của bạn sẽ ở dạng trung lập, không thể hiện
        tên cửa hàng hay thông tin sản phẩm.
      </p>
      <h2>Bảo mật giao dịch</h2>
      <p>
        Mọi thông tin thanh toán được xử lý qua kênh mã hoá an toàn.
        Vipextoy không lưu trữ thông tin thẻ của khách hàng trên hệ thống.
      </p>
    </PolicyLayout>
  );
}
