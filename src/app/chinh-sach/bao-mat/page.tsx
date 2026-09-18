import type { Metadata } from "next";
import { site } from "@/lib/site";
import PolicyLayout from "@/components/PolicyLayout";

export const metadata: Metadata = {
  title: "Chính sách bảo mật",
  description:
    "Chính sách bảo mật thông tin khách hàng của Vipsextoy: dữ liệu thu thập, mục đích sử dụng và cam kết không chia sẻ cho bên thứ ba.",
  alternates: { canonical: "/chinh-sach/bao-mat" },
};

export default function PrivacyPolicyPage() {
  return (
    <PolicyLayout title="Chính sách bảo mật" updatedAt="01/09/2026">
      <p>
        Vipsextoy hiểu rằng sự riêng tư là ưu tiên hàng đầu của khách hàng khi
        mua sắm sản phẩm chăm sóc cá nhân. Chính sách này giải thích cách
        chúng tôi thu thập, sử dụng và bảo vệ thông tin của bạn.
      </p>
      <h2>Thông tin thu thập</h2>
      <ul>
        <li>Họ tên, số điện thoại, địa chỉ giao hàng để xử lý đơn hàng.</li>
        <li>Email khi bạn đăng ký nhận bản tin hoặc liên hệ hỗ trợ.</li>
        <li>Thông tin duyệt web cơ bản nhằm cải thiện trải nghiệm trang web.</li>
      </ul>
      <h2>Mục đích sử dụng</h2>
      <p>
        Thông tin của bạn chỉ được dùng để xử lý đơn hàng, giao hàng, chăm
        sóc khách hàng và gửi ưu đãi (nếu bạn đăng ký). Vipsextoy không bán
        hoặc chia sẻ thông tin cá nhân cho bên thứ ba vì mục đích quảng cáo.
      </p>
      <h2>Bảo mật dữ liệu</h2>
      <p>
        Dữ liệu khách hàng được lưu trữ trên hệ thống có mã hoá và giới hạn
        quyền truy cập. Đơn hàng và thông tin giao dịch được hiển thị trung
        lập để đảm bảo riêng tư tuyệt đối cho bạn.
      </p>
      <h2>Quyền của khách hàng</h2>
      <p>
        Bạn có quyền yêu cầu xem, chỉnh sửa hoặc xoá thông tin cá nhân đã
        cung cấp bằng cách liên hệ {site.email}.
      </p>
    </PolicyLayout>
  );
}
