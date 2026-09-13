export type BlogPost = {
  slug: string;
  title: string;
  excerpt: string;
  content: string[];
  date: string;
  readTime: string;
  category: string;
  icon: "wave" | "orb" | "petal" | "spark" | "curve" | "drop" | "ring" | "bloom";
};

export const blogPosts: BlogPost[] = [
  {
    slug: "cach-chon-san-pham-cham-soc-ca-nhan-phu-hop",
    title: "Cách chọn sản phẩm chăm sóc cá nhân phù hợp với bạn",
    excerpt:
      "Từ chất liệu, kích thước đến chế độ vận hành — đây là những yếu tố nên cân nhắc trước khi chọn mua sản phẩm đầu tiên.",
    content: [
      "Chọn sản phẩm chăm sóc cá nhân lần đầu có thể khiến bạn bối rối trước quá nhiều lựa chọn. Điều quan trọng nhất là bắt đầu từ nhu cầu thực tế của bản thân thay vì chạy theo tính năng phức tạp.",
      "Về chất liệu, hãy ưu tiên silicone y tế cao cấp — mềm mại, không mùi, an toàn cho da nhạy cảm và dễ vệ sinh. Tránh các sản phẩm không rõ nguồn gốc chất liệu.",
      "Về kích thước và công suất, người mới nên bắt đầu với thiết kế nhỏ gọn, ít chế độ để làm quen dần, sau đó mới cân nhắc các dòng sản phẩm cao cấp hơn với nhiều chức năng.",
      "Cuối cùng, hãy chọn nơi bán uy tín, có chính sách đổi trả rõ ràng và đóng gói kín đáo — điều này đảm bảo trải nghiệm mua sắm thoải mái và riêng tư từ đầu đến cuối.",
    ],
    date: "2026-08-12",
    readTime: "4 phút đọc",
    category: "Hướng dẫn",
    icon: "wave",
  },
  {
    slug: "ve-sinh-va-bao-quan-dung-cach",
    title: "Vệ sinh và bảo quản sản phẩm đúng cách để dùng bền lâu",
    excerpt:
      "Một vài thói quen đơn giản giúp sản phẩm của bạn luôn sạch sẽ, an toàn và có tuổi thọ lâu dài hơn.",
    content: [
      "Vệ sinh sau mỗi lần sử dụng là bước không nên bỏ qua. Sử dụng dung dịch vệ sinh chuyên dụng, có độ pH cân bằng, tránh dùng xà phòng thông thường vì có thể làm khô hoặc hỏng chất liệu silicone.",
      "Sau khi vệ sinh, để sản phẩm khô tự nhiên ở nơi thoáng mát trước khi cất vào túi đựng riêng — tránh ánh nắng trực tiếp và nhiệt độ cao.",
      "Với sản phẩm dùng pin sạc, nên sạc đầy trước khi cất giữ lâu ngày và kiểm tra lại pin định kỳ mỗi vài tháng để đảm bảo tuổi thọ pin.",
      "Bảo quản trong hộp hoặc túi kín đáo, tránh để chung với các vật dụng có thể làm trầy xước bề mặt, giúp sản phẩm luôn như mới.",
    ],
    date: "2026-07-28",
    readTime: "3 phút đọc",
    category: "Hướng dẫn",
    icon: "drop",
  },
  {
    slug: "giao-hang-kin-dao-hoat-dong-nhu-the-nao",
    title: "Giao hàng kín đáo tại Vipextoy hoạt động như thế nào?",
    excerpt:
      "Giải đáp chi tiết về cách đóng gói, tên hiển thị trên đơn hàng và quy trình giao nhận để bạn hoàn toàn yên tâm.",
    content: [
      "Nhiều khách hàng còn e ngại khi mua sắm sản phẩm chăm sóc cá nhân vì lo lắng về sự riêng tư. Tại Vipextoy, mọi đơn hàng đều được đóng gói trong hộp carton trung lập, không in tên thương hiệu hay hình ảnh sản phẩm bên ngoài.",
      "Tên người gửi trên vận đơn cũng được hiển thị trung lập, không liên quan đến tên cửa hàng, giúp bạn thoải mái nhận hàng tại nhà hoặc nơi làm việc.",
      "Khi thanh toán bằng chuyển khoản hoặc thẻ, nội dung giao dịch hiển thị trên sao kê ngân hàng cũng được đặt trung lập, không thể hiện thông tin sản phẩm.",
      "Đơn hàng được giao trong 2–4 ngày làm việc trên toàn quốc, hỗ trợ kiểm tra hàng trước khi thanh toán (COD) tại nhiều khu vực.",
    ],
    date: "2026-07-10",
    readTime: "3 phút đọc",
    category: "Về Vipextoy",
    icon: "orb",
  },
  {
    slug: "loi-ich-cua-viec-cham-soc-ban-than",
    title: "Lợi ích của việc dành thời gian chăm sóc bản thân",
    excerpt:
      "Chăm sóc bản thân đúng cách không chỉ giúp thư giãn mà còn góp phần cải thiện tâm trạng và chất lượng cuộc sống.",
    content: [
      "Dành thời gian chăm sóc bản thân là một phần quan trọng của sức khoẻ tổng thể, giúp giảm căng thẳng và cải thiện tâm trạng sau những giờ làm việc mệt mỏi.",
      "Việc hiểu rõ cơ thể và nhu cầu của bản thân cũng góp phần xây dựng sự tự tin và kết nối tốt hơn trong các mối quan hệ.",
      "Không có gì phải ngại ngùng khi tìm hiểu và đầu tư vào những sản phẩm chăm sóc cá nhân chất lượng — đây là một lựa chọn chăm sóc sức khoẻ hoàn toàn bình thường và riêng tư.",
      "Hãy lắng nghe cơ thể, chọn sản phẩm phù hợp và cho phép bản thân những khoảnh khắc thư giãn xứng đáng.",
    ],
    date: "2026-06-22",
    readTime: "3 phút đọc",
    category: "Góc chia sẻ",
    icon: "petal",
  },
];

export function getBlogPost(slug: string) {
  return blogPosts.find((p) => p.slug === slug);
}
