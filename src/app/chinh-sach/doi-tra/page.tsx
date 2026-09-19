import type { Metadata } from "next";
import PolicyLayout from "@/components/PolicyLayout";

export const metadata: Metadata = {
  title: "Chính sách đổi trả",
  description:
    "Chính sách đổi trả của Vipsextoy: đổi trả trong vòng 7 ngày kể từ khi nhận hàng, xử lý nhanh chóng và quy trình bảo hành sản phẩm rõ ràng, minh bạch.",
  alternates: { canonical: "/chinh-sach/doi-tra" },
};

export default function ReturnPolicyPage() {
  return (
    <PolicyLayout title="Chính sách đổi trả" updatedAt="01/09/2026">
      <p>
        Vì lý do vệ sinh và sức khoẻ, sản phẩm chăm sóc cá nhân chỉ được đổi
        trả khi còn nguyên niêm phong, chưa qua sử dụng, trừ trường hợp lỗi
        do nhà sản xuất.
      </p>
      <h2>Điều kiện đổi trả</h2>
      <ul>
        <li>Sản phẩm còn nguyên tem, niêm phong, chưa bóc bao bì.</li>
        <li>Yêu cầu đổi trả trong vòng 7 ngày kể từ khi nhận hàng.</li>
        <li>Sản phẩm lỗi do nhà sản xuất được đổi mới miễn phí trong 3 tháng.</li>
        <li>Giữ hoá đơn hoặc mã đơn hàng để được hỗ trợ nhanh nhất.</li>
      </ul>
      <h2>Sản phẩm không áp dụng đổi trả</h2>
      <p>
        Các sản phẩm đã bóc niêm phong, đã qua sử dụng hoặc thuộc nhóm gel,
        dung dịch dùng một lần sẽ không được đổi trả, trừ khi phát hiện lỗi
        ngay khi nhận hàng.
      </p>
      <h2>Quy trình xử lý</h2>
      <p>
        Liên hệ hotline hoặc email hỗ trợ kèm hình ảnh/video tình trạng sản
        phẩm. Vipextoy phản hồi trong vòng 24 giờ làm việc và tiến hành đổi
        trả hoặc hoàn tiền sau khi xác nhận.
      </p>
    </PolicyLayout>
  );
}
