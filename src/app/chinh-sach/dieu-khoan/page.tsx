import type { Metadata } from "next";
import PolicyLayout from "@/components/PolicyLayout";

export const metadata: Metadata = {
  title: "Điều khoản sử dụng",
  description:
    "Điều khoản sử dụng website Vipsextoy: điều kiện truy cập, độ tuổi, quyền và nghĩa vụ của người dùng khi mua sắm tại Vipsextoy.",
  alternates: { canonical: "/chinh-sach/dieu-khoan" },
};

export default function TermsPage() {
  return (
    <PolicyLayout title="Điều khoản sử dụng" updatedAt="01/09/2026">
      <p>
        Khi truy cập và sử dụng website vipsextoy.com, bạn đồng ý với các
        điều khoản sử dụng dưới đây.
      </p>
      <h2>Điều kiện độ tuổi</h2>
      <p>
        Website và sản phẩm của Vipextoy chỉ dành cho người dùng từ 18 tuổi
        trở lên. Bằng việc tiếp tục truy cập, bạn xác nhận đã đủ 18 tuổi
        theo quy định pháp luật.
      </p>
      <h2>Nội dung &amp; sản phẩm</h2>
      <p>
        Thông tin sản phẩm được mô tả trung thực dựa trên đặc tính kỹ thuật
        thực tế. Hình ảnh minh hoạ mang tính chất tượng trưng, có thể khác
        biệt nhẹ so với sản phẩm thực tế.
      </p>
      <h2>Trách nhiệm người dùng</h2>
      <p>
        Người dùng chịu trách nhiệm cung cấp thông tin chính xác khi đặt
        hàng và sử dụng sản phẩm đúng theo hướng dẫn đi kèm để đảm bảo an
        toàn cho bản thân.
      </p>
      <h2>Thay đổi điều khoản</h2>
      <p>
        Vipextoy có thể cập nhật điều khoản sử dụng theo thời gian. Phiên
        bản mới nhất luôn được đăng tải công khai tại trang này.
      </p>
    </PolicyLayout>
  );
}
