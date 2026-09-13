import type { Metadata } from "next";
import PolicyLayout from "@/components/PolicyLayout";

export const metadata: Metadata = {
  title: "Chính sách vận chuyển",
  description:
    "Chính sách vận chuyển của Vipextoy: thời gian giao hàng, phí vận chuyển, đóng gói kín đáo và khu vực áp dụng thanh toán khi nhận hàng (COD).",
  alternates: { canonical: "/chinh-sach/van-chuyen" },
};

export default function ShippingPolicyPage() {
  return (
    <PolicyLayout title="Chính sách vận chuyển" updatedAt="01/09/2026">
      <p>
        Vipextoy cam kết giao hàng nhanh chóng, an toàn và tuyệt đối kín đáo
        đến tay khách hàng trên toàn quốc.
      </p>
      <h2>Thời gian giao hàng</h2>
      <ul>
        <li>Nội thành TP.HCM và Hà Nội: 1–2 ngày làm việc.</li>
        <li>Các tỉnh, thành khác: 2–4 ngày làm việc.</li>
        <li>Khu vực miền núi, hải đảo: 4–6 ngày làm việc.</li>
      </ul>
      <h2>Phí vận chuyển</h2>
      <p>
        Phí vận chuyển tiêu chuẩn là 30.000₫ mỗi đơn hàng. Miễn phí vận
        chuyển cho đơn hàng từ 1.000.000₫ trở lên.
      </p>
      <h2>Đóng gói kín đáo</h2>
      <p>
        Mọi đơn hàng được đóng trong hộp carton trung lập, không in tên
        thương hiệu hay hình ảnh sản phẩm. Tên người gửi trên vận đơn được
        hiển thị trung lập, không liên quan đến Vipextoy.
      </p>
      <h2>Kiểm tra hàng &amp; thanh toán khi nhận hàng (COD)</h2>
      <p>
        Vipextoy hỗ trợ kiểm tra tình trạng bên ngoài kiện hàng trước khi
        thanh toán tại hầu hết khu vực áp dụng COD. Vui lòng không mở niêm
        phong sản phẩm bên trong trước khi hoàn tất thanh toán để đảm bảo
        quyền lợi đổi trả.
      </p>
    </PolicyLayout>
  );
}
