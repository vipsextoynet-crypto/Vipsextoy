
import { GoogleGenAI, Type, HarmCategory, HarmBlockThreshold } from '@google/genai';
import { SeoArticle, ImageGenerationSettings, SeoImageItem, HotTopicItem } from '../types';
import { getImageProvider } from './imageProvider';
import { 
    buildSceneBrief, 
    buildDynamicImagePrompt, 
    evaluateRelevance, 
    TASTEFUL_ADULT_WELLNESS_STOCK 
} from './imageContextService';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set. Please make sure it's available.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const safetySettings = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_CIVIC_INTEGRITY, threshold: HarmBlockThreshold.BLOCK_NONE },
];

export const CURATED_HOT_TOPICS_30_DAYS: HotTopicItem[] = [
    // 1. Trending 30 ngày (Công nghệ mới & Sóng âm)
    {
        id: 'trend-1',
        title: 'Top 7 Máy Rung Sóng Âm (Air-Pulse) Được Săn Lùng Nhiều Nhất 30 Ngày Qua',
        category: 'trending',
        badge: '🔥 Top 1 Trending 30 ngày',
        trendScore: 98,
        description: 'Tổng hợp các dòng máy kích thích không tiếp xúc bằng sóng xung khí đang dẫn đầu xu hướng tìm kiếm và mua sắm của phái đẹp.',
        targetKeyword: 'máy rung sóng âm air pulse',
        searchIntent: 'Đánh giá (Commercial)',
    },
    {
        id: 'trend-2',
        title: 'Công Nghệ Máy Rung Điều Khiển Qua App Từ Xa: Xu Hướng Hot Cho Cặp Đôi Yêu Xa',
        category: 'trending',
        badge: '⚡ Tăng trưởng 320%',
        trendScore: 94,
        description: 'Khám phá thế hệ sextoy thông minh kết nối Bluetooth và WiFi, giúp các cặp đôi giữ lửa tình cảm dù cách xa hàng ngàn cây số.',
        targetKeyword: 'sextoy điều khiển qua app từ xa',
        searchIntent: 'Thông tin (Informational)',
    },
    {
        id: 'trend-3',
        title: 'Trứng Rung Không Dây Tần Số Cao: Trải Nghiệm Thăng Hoa Kín Đáo Thế Hệ Mới',
        category: 'trending',
        badge: '✨ Xu hướng mới',
        trendScore: 92,
        description: 'Đánh giá các mẫu trứng rung mini thiết kế công thái học, chống ồn tuyệt đối và thời lượng pin vượt trội cho người bận rộn.',
        targetKeyword: 'trứng rung không dây cao cấp',
        searchIntent: 'Đánh giá (Commercial)',
    },
    {
        id: 'trend-4',
        title: 'Silicone Y Tế Platinum Kháng Khuẩn: Chuẩn Mực An Toàn Cho Đồ Chơi Tình Dục 2026',
        category: 'trending',
        badge: '🛡️ An toàn sức khỏe',
        trendScore: 89,
        description: 'Vì sao chất liệu Liquid Medical-grade Silicone đang trở thành tiêu chuẩn vàng bắt buộc của các thương hiệu adult wellness cao cấp.',
        targetKeyword: 'silicone y tế platinum sextoy',
        searchIntent: 'Thông tin (Informational)',
    },

    // 2. Mua hàng & Chuyển đổi cao
    {
        id: 'buy-1',
        title: 'Kinh Nghiệm Mua Đồ Chơi Tình Dục Giao Hàng Hỏa Tốc, Đóng Gói Kín Đáo 100%',
        category: 'buying',
        badge: '🎯 Tỷ lệ chuyển đổi cao',
        trendScore: 96,
        description: 'Hướng dẫn cách đặt hàng online an toàn, che tên sản phẩm hoàn toàn trên bill và nhận hàng nhanh chóng trong 2 giờ tại các thành phố lớn.',
        targetKeyword: 'mua sextoy kín đáo giao nhanh',
        searchIntent: 'Mua hàng (Transactional)',
    },
    {
        id: 'buy-2',
        title: 'Top 5 Shop Đồ Chơi Người Lớn Uy Tín, Chính Hãng Tại TP.HCM và Hà Nội',
        category: 'buying',
        badge: '🏆 Bán chạy 30 ngày',
        trendScore: 95,
        description: 'Danh sách các địa chỉ phân phối thiết bị intimate wellness chính hãng, có bảo hành 1 đổi 1 và tư vấn chuyên nghiệp, tận tâm.',
        targetKeyword: 'shop đồ chơi người lớn uy tín tphcm',
        searchIntent: 'Mua hàng (Transactional)',
    },
    {
        id: 'buy-3',
        title: 'Bí Quyết Chọn Gel Bôi Trơn Gốc Nước Tự Nhiên Không Gây Dị Ứng Cho Da Nhạy Cảm',
        category: 'buying',
        badge: '🌿 Sản phẩm tự nhiên',
        trendScore: 91,
        description: 'Tiêu chí chọn lựa gel bôi trơn cân bằng độ pH, không chứa paraben hay hương liệu nhân tạo, phù hợp cho cơ địa nhạy cảm.',
        targetKeyword: 'gel bôi trơn gốc nước da nhạy cảm',
        searchIntent: 'Mua hàng (Transactional)',
    },
    {
        id: 'buy-4',
        title: 'Cách Nhận Biết Sextoy Chính Hãng và Hàng Nhái Kém Chất Lượng Để Bảo Vệ Bản Thân',
        category: 'buying',
        badge: '⚠️ Cảnh báo người dùng',
        trendScore: 88,
        description: 'Phân biệt mã QR check auth, tem chống hàng giả và chất liệu nhựa tái chế độc hại trôi nổi trên thị trường.',
        targetKeyword: 'cách phân biệt đồ chơi người lớn chính hãng',
        searchIntent: 'Hướng dẫn (How-to)',
    },

    // 3. Review & So sánh
    {
        id: 'rev-1',
        title: 'So Sánh Chi Tiết Máy Rung Điểm G và Máy Hút Âm Vật: Phái Đẹp Nên Chọn Loại Nào?',
        category: 'review',
        badge: '⭐ So sánh được đọc nhiều nhất',
        trendScore: 97,
        description: 'Phân tích cơ chế tác động sâu bên trong vs kích thích sóng âm bề mặt, giúp bạn chọn đúng sản phẩm theo nhu cầu cơ thể.',
        targetKeyword: 'so sánh máy rung điểm g và máy hút',
        searchIntent: 'Đánh giá (Commercial)',
    },
    {
        id: 'rev-2',
        title: 'Review Thực Tế Cốc Thủ Dâm Tự Động Rung Xoay Thế Hệ Mới Dành Cho Nam Giới',
        category: 'review',
        badge: '🔥 Cực hot 30 ngày',
        trendScore: 93,
        description: 'Đánh giá chi tiết lực hút chân không, nhiệt độ sưởi ấm 40°C và các chế độ rung xoay đa tầng mô phỏng chân thực.',
        targetKeyword: 'review cốc thủ dâm tự động',
        searchIntent: 'Đánh giá (Commercial)',
    },
    {
        id: 'rev-3',
        title: 'Gel Bôi Trơn Gốc Nước vs Gốc Silicon: Loại Nào Trơn Lâu Và Dễ Vệ Sinh Hơn?',
        category: 'review',
        badge: '📊 Phân tích chuyên sâu',
        trendScore: 90,
        description: 'Bảng so sánh chi tiết về độ trơn mượt, khả năng tương thích bao cao su, đồ chơi tình dục và cách làm sạch sau khi sử dụng.',
        targetKeyword: 'so sánh gel gốc nước và gốc silicon',
        searchIntent: 'Đánh giá (Commercial)',
    },
    {
        id: 'rev-4',
        title: 'Đánh Giá Máy Rung Cao Cấp Đa Năng: Liệu Có Xứng Đáng Với Mức Giá Tiền Triệu?',
        category: 'review',
        badge: '💎 Phân khúc Luxury',
        trendScore: 87,
        description: 'Trải nghiệm thực tế về độ bền động cơ, chất liệu phủ nhung mượt mà và khả năng chống nước IPX7.',
        targetKeyword: 'đánh giá máy massage cá nhân cao cấp',
        searchIntent: 'Đánh giá (Commercial)',
    },

    // 4. Kiến thức & Nghệ thuật phòng the (Lifestyle)
    {
        id: 'life-1',
        title: 'Nghệ Thuật Sử Dụng Đồ Chơi Phòng The Giúp Hâm Nóng Lửa Yêu Cho Vợ Chồng Lâu Năm',
        category: 'lifestyle',
        badge: '💑 Gắn kết lứa đôi',
        trendScore: 95,
        description: 'Bí quyết phá vỡ sự nhàm chán trong phòng ngủ, tạo sự tin tưởng và khám phá những cung bậc cảm xúc mới mẻ cùng bạn đời.',
        targetKeyword: 'cách dùng sextoy cho vợ chồng',
        searchIntent: 'Thông tin (Informational)',
    },
    {
        id: 'life-2',
        title: 'Giải Mã Bản Đồ Khoái Cảm Phụ Nữ: Bí Quyết Đạt Cực Khoái Kép Cùng Thiết Bị Hỗ Trợ',
        category: 'lifestyle',
        badge: '🌸 Chăm sóc phái đẹp',
        trendScore: 93,
        description: 'Hiểu rõ giải phẫu vùng chậu, điểm G, điểm A và cách kết hợp nhịp nhàng giữa máy rung và cử chỉ yêu thương.',
        targetKeyword: 'bản đồ khoái cảm phụ nữ và máy rung',
        searchIntent: 'Thông tin (Informational)',
    },
    {
        id: 'life-3',
        title: 'Cách Trò Chuyện Và Cùng Đối Tác Trải Nghiệm Đồ Chơi Tình Dục Một Cách Tinh Tế',
        category: 'lifestyle',
        badge: '💬 Tâm lý & Thấu hiểu',
        trendScore: 89,
        description: 'Hướng dẫn mở lời không ngại ngùng, xóa bỏ định kiến và biến sextoy thành công cụ kết nối thăng hoa cho cả hai.',
        targetKeyword: 'cách thuyết phục người yêu dùng đồ chơi',
        searchIntent: 'Thông tin (Informational)',
    },
    {
        id: 'life-4',
        title: 'Sexual Wellness và Self-Care: Vì Sao Tự Chăm Sóc Cảm Xúc Giúp Giảm Stress Đỉnh Cao',
        category: 'lifestyle',
        badge: '🧘‍♀️ Sức khỏe tinh thần',
        trendScore: 91,
        description: 'Lợi ích khoa học của endorphin và oxytocin giải phóng khi đạt cực khoái đối với giấc ngủ sâu và làn da rạng rỡ.',
        targetKeyword: 'lợi ích của sexual wellness đối với sức khỏe',
        searchIntent: 'Thông tin (Informational)',
    },

    // 5. Hướng dẫn & Bảo quản an toàn
    {
        id: 'guide-1',
        title: 'Hướng Dẫn Vệ Sinh Đồ Chơi Tình Dục Bằng Dung Dịch Chuyên Dụng Đúng Cách 100%',
        category: 'guide',
        badge: '🧼 Vệ sinh chuẩn Y khoa',
        trendScore: 94,
        description: 'Quy trình 4 bước làm sạch, khử trùng không làm hỏng lớp silicone và chống vi khuẩn tích tụ gây viêm nhiễm.',
        targetKeyword: 'cách vệ sinh đồ chơi người lớn đúng cách',
        searchIntent: 'Hướng dẫn (How-to)',
    },
    {
        id: 'guide-2',
        title: 'Cách Bảo Quản Sextoy Kín Đáo, Chống Ẩm Mốc Và Kéo Dài Tuổi Thọ Pin',
        category: 'guide',
        badge: '📦 Bảo quản kín đáo',
        trendScore: 92,
        description: 'Mẹo cất giữ trong túi nhung thoáng khí, tránh ánh nắng trực tiếp và cách bảo dưỡng pin lithium không bị chai.',
        targetKeyword: 'cách bảo quản sextoy kín đáo bền lâu',
        searchIntent: 'Hướng dẫn (How-to)',
    },
    {
        id: 'guide-3',
        title: 'Quy Tắc An Toàn Tuyệt Đối Khi Sử Dụng Đồ Chơi Tình Dục Bạn Không Thể Bỏ Qua',
        category: 'guide',
        badge: '🛡️ An toàn người dùng',
        trendScore: 90,
        description: 'Không dùng gel gốc dầu cho silicone, kiểm tra độ nguyên vẹn của thân máy và cách nhận biết sản phẩm kháng nước đạt chuẩn IPX.',
        targetKeyword: 'quy tắc an toàn khi dùng đồ chơi tình dục',
        searchIntent: 'Hướng dẫn (How-to)',
    },
    {
        id: 'guide-4',
        title: 'Cách Sạc Pin Từ Tính Và Bảo Vệ Cổng Sạc Chống Nước Của Thiết Bị Massage Cao Cấp',
        category: 'guide',
        badge: '🔋 Hướng dẫn kỹ thuật',
        trendScore: 86,
        description: 'Lưu ý khi sạc cáp nam châm từ tính USB, không dùng củ sạc nhanh quá dòng và cách làm khô chân tiếp xúc trước khi cắm sạc.',
        targetKeyword: 'cách sạc pin máy rung an toàn',
        searchIntent: 'Hướng dẫn (How-to)',
    },
];

export const CURATED_HOT_TOPICS_POOL_2: HotTopicItem[] = [
    {
        id: 'pool2-trend-1',
        title: 'Top 5 Máy Massage Điểm G Nhỏ Gọn Dành Riêng Cho Các Chuyến Du Lịch Kín Đáo',
        category: 'trending',
        badge: '✈️ Du lịch tiện lợi',
        trendScore: 97,
        description: 'Đánh giá các mẫu máy rung mini kích thước bằng thỏi son, tích hợp khóa an toàn du lịch (Travel Lock) và chống ồn tuyệt đối dưới 40dB.',
        targetKeyword: 'máy rung mini du lịch kín đáo',
        searchIntent: 'Đánh giá (Commercial)',
    },
    {
        id: 'pool2-trend-2',
        title: 'Bóng Tập Kegel Thông Minh Kết Nối Bluetooth: Giải Pháp Phục Hồi Vùng Chậu Số 1',
        category: 'trending',
        badge: '💪 Sức khỏe vùng chậu',
        trendScore: 95,
        description: 'Ứng dụng cảm biến lực co bóp Biofeedback giúp phụ nữ sau sinh và nhân viên văn phòng tập luyện siết chặt vùng sàn chậu một cách khoa học.',
        targetKeyword: 'bóng tập kegel thông minh',
        searchIntent: 'Thông tin (Informational)',
    },
    {
        id: 'pool2-trend-3',
        title: 'Top 6 Mẫu Sextoy Đôi Cùng Rung Độc Đáo Giúp Cả Hai Cùng Lên Đỉnh Đồng Thời',
        category: 'trending',
        badge: '💑 Cực khoái kép',
        trendScore: 93,
        description: 'Khám phá các thiết bị dạng chữ C hoặc vòng đeo đôi rung kép, truyền xung nhịp đồng điệu cho cả nam và nữ trong lúc quan hệ.',
        targetKeyword: 'sextoy đôi cho cặp đôi',
        searchIntent: 'Đánh giá (Commercial)',
    },
    {
        id: 'pool2-buy-1',
        title: 'Kinh Nghiệm Nhận Hàng Sextoy Không Bị Lộ Thông Tin: Mẹo Che Tên Đơn Hàng 100%',
        category: 'buying',
        badge: '📦 Bảo mật 100%',
        trendScore: 96,
        description: 'Bí kíp yêu cầu đóng gói hộp carton trơn không in logo, đổi tên sản phẩm thành quà tặng cá nhân và nhận hàng tại bưu cục kín đáo.',
        targetKeyword: 'cách mua đồ chơi người lớn không bị lộ',
        searchIntent: 'Hướng dẫn (How-to)',
    },
    {
        id: 'pool2-buy-2',
        title: 'Cẩm Nang Chọn Bao Cao Su Siêu Mỏng Có Gân Gai Tăng Khoái Cảm Cho Cặp Đôi',
        category: 'buying',
        badge: '🛒 Bán chạy nhất',
        trendScore: 92,
        description: 'Phân loại các dòng bao cao su 0.01mm truyền nhiệt nhanh, bổ sung nhiều gel bôi trơn Hyaluronic Acid cao cấp không gây rát buốt.',
        targetKeyword: 'bao cao su siêu mỏng gân gai tốt',
        searchIntent: 'Mua hàng (Transactional)',
    },
    {
        id: 'pool2-buy-3',
        title: 'Tiêu Chí Chọn Dầu Mát-xa Cơ Thể Hương Nước Hoa Dành Riêng Cho Màn Dạo Đầu',
        category: 'buying',
        badge: '🌸 Thư giãn gợi cảm',
        trendScore: 89,
        description: 'Cách chọn tinh dầu hạt nho, dầu jojoba tự nhiên tan trong nước, không gây bí bách lỗ chân lông và đánh thức mọi giác quan xúc giác.',
        targetKeyword: 'dầu massage dạo đầu gợi cảm',
        searchIntent: 'Mua hàng (Transactional)',
    },
    {
        id: 'pool2-rev-1',
        title: 'Review Chi Tiết Vòng Rung Tình Yêu Chống Xuất Tinh Sớm Cho Nam Giới',
        category: 'review',
        badge: '⚡ Kéo dài thời gian',
        trendScore: 98,
        description: 'Cơ chế thắt nhẹ kiểm soát lưu thông máu kết hợp đầu rung kích thích âm vật của bạn nữ, giải pháp toàn diện cho nam giới.',
        targetKeyword: 'review vòng rung tình yêu kéo dài thời gian',
        searchIntent: 'Đánh giá (Commercial)',
    },
    {
        id: 'pool2-rev-2',
        title: 'So Sánh Máy Rung Silicone Cao Cấp vs Thủy Tinh Borosilicate: Cảm Giác Nào Tinh Tế Hơn?',
        category: 'review',
        badge: '🔬 Phân tích chất liệu',
        trendScore: 91,
        description: 'Trải nghiệm độ đầm tay, khả năng giữ nhiệt (ngâm nước ấm hoặc làm lạnh) độc đáo của thủy tinh y tế so với sự mềm mịn của silicone.',
        targetKeyword: 'so sánh sextoy silicone và thủy tinh',
        searchIntent: 'Đánh giá (Commercial)',
    },
    {
        id: 'pool2-rev-3',
        title: 'Review Top 3 Dòng Gel Gốc Nước Tự Nhiên Không Gây Dính Nhớp Được Đánh Giá 5 Sao',
        category: 'review',
        badge: '💧 Trơn mượt tự nhiên',
        trendScore: 94,
        description: 'Đánh giá độ tương thích sinh học, cảm giác ẩm mượt lâu dài và khả năng rửa sạch dễ dàng chỉ bằng nước ấm.',
        targetKeyword: 'gel bôi trơn không dính tốt nhất',
        searchIntent: 'Đánh giá (Commercial)',
    },
    {
        id: 'pool2-life-1',
        title: 'Liệu Pháp Massage Điểm Nhạy Cảm Giúp Cải Thiện Chứng Mất Ngủ Ở Phụ Nữ Bận Rộn',
        category: 'lifestyle',
        badge: '🌙 Ngủ ngon & Thư giãn',
        trendScore: 93,
        description: 'Các nghiên cứu khoa học chỉ ra việc đạt khoái cảm giúp não bộ giải phóng oxytocin và prolactin, liều thuốc an thần tự nhiên không tác dụng phụ.',
        targetKeyword: 'lợi ích của cực khoái với giấc ngủ phụ nữ',
        searchIntent: 'Thông tin (Informational)',
    },
    {
        id: 'pool2-life-2',
        title: 'Cách Xây Dựng Không Gian Yêu Lãng Mạn Với Nến Massage Ấm Áp Và Âm Nhạc Trị Liệu',
        category: 'lifestyle',
        badge: '🕯️ Nghệ thuật yêu',
        trendScore: 90,
        description: 'Nghệ thuật thắp lửa cảm xúc phòng the: ánh sáng mờ ảo, hương thơm hoa hoàng lan ylang-ylang và nến sáp đậu nành tan chảy thành dầu massage.',
        targetKeyword: 'tạo không gian yêu lãng mạn cho vợ chồng',
        searchIntent: 'Thông tin (Informational)',
    },
    {
        id: 'pool2-guide-1',
        title: 'Tại Sao Tuyệt Đối Không Nên Vệ Sinh Đồ Chơi Bằng Cồn 90 Độ Hoặc Sữa Tắm Thường?',
        category: 'guide',
        badge: '⚠️ Cảnh báo hỏng máy',
        trendScore: 95,
        description: 'Cồn phá hủy lớp phủ bảo vệ silicone khiến bề mặt bị chảy nhão và dính nhớp; sữa tắm chứa hóa chất ăn mòn mạch điện chống nước.',
        targetKeyword: 'sai lầm khi vệ sinh đồ chơi tình dục',
        searchIntent: 'Hướng dẫn (How-to)',
    },
    {
        id: 'pool2-guide-2',
        title: 'Cách Khử Mùi Và Làm Mới Bề Mặt Silicone Của Sextoy Sau Thời Gian Dài Sử Dụng',
        category: 'guide',
        badge: '✨ Mẹo bảo dưỡng',
        trendScore: 88,
        description: 'Mẹo xử lý bề mặt silicone bị dính bám bằng bột bắp tự nhiên (cornstarch) và dung dịch khử khuẩn chuyên dụng an toàn.',
        targetKeyword: 'cách làm mới bề mặt silicone sextoy',
        searchIntent: 'Hướng dẫn (How-to)',
    },
];

const articleSchema = {
    type: Type.OBJECT,
    properties: {
        title: { type: Type.STRING, description: 'Tiêu đề chuẩn SEO, cực kỳ thu hút, nhấn mạnh vào lợi ích sức khỏe và cảm xúc.' },
        content: { type: Type.STRING, description: "Toàn bộ bài viết bằng mã HTML hoàn chỉnh (H1, H2, H3, p, ul, li, etc). Chèn [PROMPT: ...] định kỳ để minh họa hình ảnh theo từng section." },
        tags: { type: Type.ARRAY, items: { type: Type.STRING } },
        relatedKeywords: { type: Type.ARRAY, items: { type: Type.STRING } },
        imagePrompt: { type: Type.STRING, description: 'Mô tả chi tiết ảnh đại diện theo phong cách chụp ảnh sản phẩm thương mại cao cấp.' },
        urlSlug: { type: Type.STRING },
        metaKeywords: { type: Type.STRING },
        metaDescription: { type: Type.STRING, description: 'Mô tả meta chuẩn SEO, kích thích click.' },
        htmlHeader: { type: Type.STRING, description: 'JSON-LD Schema.' },
        usedInternalLinks: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Danh sách các internal URL thực tế đã sử dụng trong bài viết.' },
    },
    required: ['title', 'content', 'tags', 'relatedKeywords', 'imagePrompt', 'urlSlug', 'metaKeywords', 'metaDescription', 'htmlHeader', 'usedInternalLinks'],
};

export async function generateHotTopics30Days(keyword?: string, forceRefresh: boolean = false): Promise<HotTopicItem[]> {
    // Only return initial curated on cold load without keyword and not forcing refresh
    if (!keyword?.trim() && !forceRefresh) {
        return CURATED_HOT_TOPICS_30_DAYS;
    }

    const hotTopicsSchema = {
        type: Type.OBJECT,
        properties: {
            topics: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        id: { type: Type.STRING },
                        title: { type: Type.STRING, description: 'Tiêu đề bài viết chuẩn SEO, thu hút, tinh tế' },
                        category: { 
                            type: Type.STRING, 
                            enum: ['trending', 'buying', 'review', 'lifestyle', 'guide'],
                            description: 'Phân loại nhóm nội dung' 
                        },
                        badge: { type: Type.STRING, description: 'Huy hiệu xu hướng, ví dụ: 🔥 Top Trend 30 ngày, ⚡ Tăng trưởng 250%, 🎯 Chuyển đổi cao' },
                        trendScore: { type: Type.NUMBER, description: 'Điểm xu hướng 80-99' },
                        description: { type: Type.STRING, description: 'Mô tả ngắn góc tiếp cận của bài viết (1-2 câu)' },
                        targetKeyword: { type: Type.STRING, description: 'Từ khóa chính cần SEO' },
                        searchIntent: { 
                            type: Type.STRING,
                            enum: ['Mua hàng (Transactional)', 'Đánh giá (Commercial)', 'Thông tin (Informational)', 'Hướng dẫn (How-to)'],
                            description: 'Mục đích tìm kiếm của người dùng'
                        }
                    },
                    required: ['id', 'title', 'category', 'badge', 'trendScore', 'description', 'targetKeyword', 'searchIntent']
                }
            }
        },
        required: ['topics'],
    };

    const trendingAngles = [
        "Công nghệ máy rung thế hệ mới và sóng âm Air-Pulse đa tầng",
        "Thiết bị kích thích không dây điều khiển từ xa qua App cho cặp đôi yêu xa",
        "Trứng rung mini chống ồn cao cấp cho người mới bắt đầu",
        "Bí quyết đời sống vợ chồng và hâm nóng cảm xúc thăng hoa",
        "Sản phẩm chăm sóc vùng chậu, bóng Kegel và giải tỏa căng thẳng sau sinh",
        "Shop đồ chơi người lớn uy tín, giao hỏa tốc 2h đóng gói che tên kín đáo",
        "Review so sánh các dòng máy rung điểm G và máy hút bán chạy nhất",
        "Gel bôi trơn gốc nước organic thuần chay và dung dịch vệ sinh chuyên dụng",
        "Top thiết bị massage thư giãn sâu và kích thích điểm nhạy cảm cho nam và nữ"
    ];

    const currentTopicAngle = keyword?.trim() || trendingAngles[Math.floor(Math.random() * trendingAngles.length)];

    const systemInstruction = `Bạn là Giám đốc Chiến lược Nội dung SEO & E-commerce cho một thương hiệu Adult Wellness & Intimate Lifestyle hàng đầu tại Việt Nam.
Nhiệm vụ: Phân tích và sinh ra 12 chủ đề "HOT CONTENT TRONG 30 NGÀY QUA" xu hướng cao nhất tại thị trường Việt Nam xoay quanh chủ đề: "${currentTopicAngle}".

YÊU CẦU NỘI DUNG:
1. Đúng định vị Adult Sexual-Wellness: Tinh tế, cao cấp, hấp dẫn, tập trung vào giá trị trải nghiệm, sức khỏe tình dục lành mạnh, an toàn và thương mại điện tử.
2. Phân bổ cân đối vào các nhóm:
   - 'trending': Công nghệ mới, xu hướng nóng hổi 30 ngày qua.
   - 'buying': Mua hàng, shop uy tín, đóng gói kín đáo, giao nhanh hỏa tốc.
   - 'review': Review thực tế, so sánh ưu nhược điểm các dòng sản phẩm.
   - 'lifestyle': Nghệ thuật phòng the, gắn kết lứa đôi, self-care giải tỏa stress.
   - 'guide': Hướng dẫn vệ sinh chuẩn Y khoa, bảo quản kín đáo bền đẹp.
3. Tiêu đề chuẩn SEO, click-through-rate (CTR) cao, thu hút nhưng không giật tít rẻ tiền.
4. Điểm trendScore ngẫu nhiên trong khoảng 85 đến 99.`;

    const modelsToTry = ["gemini-3.8-flash", "gemini-flash-latest", "gemini-3.1-flash-lite"];
    for (const modelName of modelsToTry) {
        try {
            const response = await ai.models.generateContent({
                model: modelName,
                contents: `Tạo danh sách 12 Hot Content xu hướng 30 ngày qua tại Việt Nam, tập trung vào góc độ: "${currentTopicAngle}". Yêu cầu các chủ đề phải độc đáo, hấp dẫn và khác biệt so với các chủ đề thông thường.`,
                config: {
                    systemInstruction: systemInstruction,
                    responseMimeType: "application/json",
                    responseSchema: hotTopicsSchema,
                    temperature: 0.85,
                    safetySettings: safetySettings,
                },
            });
            const parsed = JSON.parse(response.text || '{}');
            if (parsed.topics && Array.isArray(parsed.topics) && parsed.topics.length > 0) {
                // Ensure unique IDs with timestamp to force React component update
                return parsed.topics.map((item: any, idx: number) => ({
                    ...item,
                    id: item.id ? `${item.id}-${Date.now()}` : `gen-topic-${Date.now()}-${idx}`,
                    trendScore: item.trendScore || (88 + Math.floor(Math.random() * 11))
                }));
            }
        } catch (e) {
            console.warn(`Failed to generate hot topics 30 days with model ${modelName}:`, e);
        }
    }

    // High-quality fallback with shuffle to guarantee fresh topics on every refresh
    const allCurated = [...CURATED_HOT_TOPICS_30_DAYS, ...CURATED_HOT_TOPICS_POOL_2];
    
    if (keyword && keyword.trim()) {
        const lowerKw = keyword.toLowerCase().trim();
        const matched = allCurated.filter(t => 
            t.title.toLowerCase().includes(lowerKw) || 
            t.targetKeyword.toLowerCase().includes(lowerKw) ||
            t.description.toLowerCase().includes(lowerKw)
        );
        if (matched.length > 0) {
            return matched.map((t, idx) => ({ ...t, id: `${t.id}-${Date.now()}-${idx}` }));
        }
    }

    // Shuffle and pick 15 items with new unique IDs
    const shuffled = [...allCurated].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 16).map((item, idx) => ({
        ...item,
        id: `shuffled-${Date.now()}-${idx}`,
        trendScore: Math.min(99, 86 + Math.floor(Math.random() * 14))
    }));
}

export async function generateSuggestedTopics(keyword?: string): Promise<string[]> {
    const hotTopics = await generateHotTopics30Days(keyword, true);
    return hotTopics.map(t => t.title);
}

function repairAndParseJson(text: string): any {
    text = text.trim();
    
    // Clean markdown blocks
    if (text.startsWith("```json")) {
        text = text.substring(7);
    } else if (text.startsWith("```")) {
        text = text.substring(3);
    }
    if (text.endsWith("```")) {
        text = text.substring(0, text.length - 3);
    }
    text = text.trim();

    try {
        return JSON.parse(text);
    } catch (e: any) {
        console.warn("Initial JSON parsing failed, attempting repair... Error:", e.message);
        
        let repairedText = text;
        let openBraces = 0;
        let openBrackets = 0;
        let inString = false;
        let escaped = false;

        for (let i = 0; i < repairedText.length; i++) {
            const char = repairedText[i];
            if (escaped) {
                escaped = false;
                continue;
            }
            if (char === '\\') {
                escaped = true;
                continue;
            }
            if (char === '"') {
                inString = !inString;
            }
            if (!inString) {
                if (char === '{') openBraces++;
                if (char === '}') openBraces--;
                if (char === '[') openBrackets++;
                if (char === ']') openBrackets--;
            }
        }

        // If we are left in an unclosed string, close the string first
        if (inString) {
            repairedText += '"';
        }

        // Close any unclosed arrays
        while (openBrackets > 0) {
            repairedText += ']';
            openBrackets--;
        }

        // Close any unclosed objects
        while (openBraces > 0) {
            repairedText += '}';
            openBraces--;
        }

        try {
            return JSON.parse(repairedText);
        } catch (repairError) {
            console.error("Repair failed as well, attempting Regex extraction.", repairError);
            
            // Regex based recovery of essential fields
            const extractStringField = (field: string): string => {
                const regex = new RegExp(`"${field}"\\s*:\\s*"([^"\\\\]*(?:\\\\.[^"\\\\]*)*)"`, 'i');
                const match = regex.exec(text);
                if (match) {
                    try {
                        return JSON.parse(`{"v": "${match[1]}"}`).v;
                    } catch {
                        return match[1];
                    }
                }
                
                // Fallback for cut-off string field at the end
                const fallbackRegex = new RegExp(`"${field}"\\s*:\\s*"(.*)$`, 's');
                const fallbackMatch = fallbackRegex.exec(text);
                if (fallbackMatch) {
                    let val = fallbackMatch[1].trim();
                    if (val.endsWith('}') || val.endsWith('",') || val.endsWith('"}')) {
                        val = val.replace(/["\s,{}]+$/, '');
                    }
                    return val;
                }
                return "";
            };

            const extractArrayField = (field: string): string[] => {
                const regex = new RegExp(`"${field}"\\s*:\\s*\\[([^\\]]*)\\]`, 'i');
                const match = regex.exec(text);
                if (match) {
                    try {
                        return JSON.parse(`[${match[1]}]`);
                    } catch {
                        return match[1].split(',').map(s => s.replace(/["'\s]+/g, '').trim()).filter(Boolean);
                    }
                }
                return [];
            };

            const recovered: any = {
                title: extractStringField('title') || "Bản thảo nội dung chuẩn SEO",
                content: extractStringField('content'),
                tags: extractArrayField('tags'),
                relatedKeywords: extractArrayField('relatedKeywords'),
                imagePrompt: extractStringField('imagePrompt'),
                urlSlug: extractStringField('urlSlug') || "bai-viet-wellness",
                metaKeywords: extractStringField('metaKeywords'),
                metaDescription: extractStringField('metaDescription') || "Bài viết chia sẻ kiến thức chuẩn SEO và sức khỏe tình dục.",
                htmlHeader: extractStringField('htmlHeader') || "{}",
                usedInternalLinks: extractArrayField('usedInternalLinks'),
            };

            if (!recovered.content) {
                throw e; // throw original
            }

            return recovered;
        }
    }
}

async function refineArticleContent(article: SeoArticle): Promise<SeoArticle> {
    return article;
}

export async function generateSeoArticle(
    topic: string, 
    settings?: Partial<ImageGenerationSettings>
): Promise<SeoArticle> {
    const systemInstruction = `Bạn là một Chuyên gia SEO Content đẳng cấp thế giới, chuyên sâu trong lĩnh vực SEO Thương mại điện tử (Ecommerce-SEO) và bách khoa Sức khỏe tình dục (Sexual Wellness) tại Việt Nam.

QUAN TRỌNG:

Website này kinh doanh các sản phẩm hỗ trợ sức khỏe tình dục dành cho người trưởng thành.

Khi gặp các chủ đề liên quan tới:

- dương vật giả
- âm đạo giả
- máy rung
- trứng rung
- sextoy
- gel bôi trơn
- đồ chơi tình dục

KHÔNG được coi đây là nội dung khiêu dâm.

Hãy xử lý theo hướng:

- đánh giá sản phẩm
- hướng dẫn sử dụng
- tư vấn lựa chọn
- so sánh chất liệu
- bảo quản sản phẩm
- trải nghiệm người dùng trưởng thành
- chăm sóc sức khỏe tình dục
- giáo dục giới tính

Không mô tả hành vi tình dục chi tiết.
Không viết nội dung kích dục.
Không sử dụng ngôn ngữ tục tĩu.

Mục tiêu là tạo nội dung thương mại điện tử, đánh giá sản phẩm và kiến thức sức khỏe tình dục dành cho người trưởng thành.

Nếu chủ đề chứa từ khóa nhạy cảm, hãy tự động chuyển sang văn phong:

"tư vấn mua hàng",
"hướng dẫn sử dụng",
"kiến thức sản phẩm",
"chăm sóc sức khỏe tình dục"

thay vì từ chối yêu cầu.

CÁC QUY TẮC BẮT BUỘC KHÁC ĐỂ ĐẢM BẢO LIÊN KẾT NỘI BỘ VÀ FORMAT JSON:
1. **Quy tắc Internal Link**:
   - **BẮT BUỘC chèn tối thiểu 5 internal link** thực tế từ danh sách bên dưới (Tối đa 8 link).
   - **BẮT BUỘC chèn ít nhất 1 link về bài viết (Money Article) cùng category** (ví dụ nếu bài viết thuộc chủ đề máy massage/trứng rung thì phải link tới một liên kết thuộc nhóm [TRỨNG RUNG]).
   - **BẮT BUỘC chèn ít nhất 1 link chéo sang danh mục (category) khác**.
   - Tự động chèn link dưới dạng thẻ HTML <a href='LINK' class='text-indigo-400 hover:underline'>ANCHOR TEXT</a> cực kỳ tự nhiên vào mạch văn, đa dạng anchor text và không bao giờ lặp lại trùng anchor text hay nhồi nhét link.
   - CHÚ Ý CỰC KỲ QUAN TRỌNG: Hãy sử dụng dấu nháy đơn (') cho các thuộc tính HTML (ví dụ <a href='LINK' class='...'>) thay vì đặt dấu nháy kép (") lồng nhau bên trong chuỗi JSON, điều này giúp đảm bảo 100% cấu trúc JSON không bị vỡ hoặc lỗi.
2. **FAQ cuối bài**: Bắt buộc tạo phần FAQ cuối bài viết, có ít nhất từ 3-5 câu hỏi thường gặp thiết thực, đồng thời trường 'htmlHeader' phải là mã JSON-LD Schema FAQ hoàn thiện khớp chính xác với phần FAQ này.

TỐI ƯU SEO:
- Từ khóa chính và các biến thể liên quan phải xuất hiện tự nhiên tại:
  - SEO Title (Thẻ title)
  - Thẻ Meta Description
  - URL (urlSlug)
  - Thẻ H1
  - Ít nhất một thẻ H2
  - Ngay đoạn đầu tiên của bài viết.

DANH SÁCH LINK ĐƯỢC PHÉP SỬ DỤNG:
- Nhóm [DƯƠNG VẬT GIẢ]:
  - https://vipsextoy.net/duong-vat-gia-loai-nao-tot-cho-nguoi-moi.html
  - https://vipsextoy.net/cach-chon-duong-vat-gia-phu-hop-cho-nu-gioi.html
  - https://vipsextoy.net/cach-ve-sinh-duong-vat-gia-dung-cach.html
- Nhóm [ÂM ĐẠO GIẢ]:
  - https://vipsextoy.net/am-dao-gia-loai-nao-phu-hop-cho-nguoi-moi.html
  - https://vipsextoy.net/cach-chon-am-dao-gia-phu-hop.html
  - https://vipsextoy.net/cach-ve-sinh-am-dao-gia-dung-cach.html
- Nhóm [TRỨNG RUNG]:
  - https://vipsextoy.net/trung-rung-la-gi.html
  - https://vipsextoy.net/cach-chon-trung-rung-phu-hop.html
  - https://vipsextoy.net/cach-ve-sinh-trung-rung-dung-cach.html
- Nhóm [GEL BÔI TRƠN]:
  - https://vipsextoy.net/gel-boi-tron-la-gi.html
  - https://vipsextoy.net/cach-chon-gel-boi-tron-phu-hop-cho-nguoi-moi.html
  - https://vipsextoy.net/gel-goc-nuoc-va-gel-goc-silicon-khac-nhau-the-nao.html

YÊU CẦU ĐỊNH DẠNG ĐẦU RA JSON KHẮT KHE:
- Toàn bộ nội dung bài viết phải được bọc trong mã HTML hoàn chỉnh và trả về tại trường "content". Sử dụng các thẻ HTML: <h1>, <h2>, <h3>, <p>, <ul>, <li>, <strong>, <a>, <div class='faq-section'>...
- Sử dụng dấu nháy đơn (') cho toàn bộ thuộc tính HTML bên trong trường "content" (ví dụ <div class='faq-section'>, <a href='...'>) để tránh tuyệt đối lỗi parsing JSON do dấu nháy kép không mong muốn.
- Cứ sau khoảng 3-4 đoạn văn (hoặc dưới mỗi thẻ <h2> chính), hãy chủ động chèn một dòng [PROMPT: detailed commercial product photography prompt in English, focusing 35-60% on the exact adult wellness product mentioned in this section, tasteful, non-explicit, photorealistic, no doctors, no hospital, no facial skincare/spa] để hệ thống AI sinh ảnh minh họa chính xác theo section.
- Trường "usedInternalLinks" phải chứa danh sách mảng các link URL thực tế bạn đã chèn thành công trong bài biết.`;

    const prompt = `Viết bài SEO 2000-3000 từ.

Chủ đề: ${topic}

Mục tiêu:

1. Giải thích kiến thức sản phẩm.
2. So sánh các lựa chọn.
3. Hướng dẫn người mới.
4. Trả lời câu hỏi thường gặp.
5. Lồng ghép sản phẩm phù hợp một cách tự nhiên.

Đối tượng:

Người trưởng thành trên 18 tuổi.

Yêu cầu:

- Không mô tả hành vi tình dục.
- Không viết nội dung kích dục.
- Không kể chuyện trải nghiệm cá nhân.
- Tập trung vào lợi ích sản phẩm, chất liệu, cách dùng, bảo quản và lựa chọn.

Cấu trúc:

H1
Mở bài

H2
H2
H2
H2
H2

FAQ

Kết luận

Độ dài tối thiểu 2000 từ. Chèn tối thiểu 5 link nội bộ thực tế từ danh sách cung cấp theo đúng hướng dẫn. Sử dụng dấu nháy đơn (') cho toàn bộ thuộc tính HTML bên trong trường "content" để đảm bảo chuẩn JSON 100%.`;

    // Attempt primary model: gemini-3.7-flash, with fallback to gemini-flash-latest and gemini-3.1-flash-lite
    const modelsToTry = ["gemini-3.7-flash", "gemini-flash-latest", "gemini-3.1-flash-lite"];
    let lastError: any = null;

    for (const modelName of modelsToTry) {
        try {
            const textResponse = await ai.models.generateContent({
                model: modelName,
                contents: prompt,
                config: {
                    systemInstruction: systemInstruction,
                    responseMimeType: "application/json",
                    responseSchema: articleSchema,
                    temperature: 0.7,
                    maxOutputTokens: 8192,
                    safetySettings: safetySettings,
                },
            });
            
            const rawText = textResponse.text || (textResponse.candidates?.[0]?.content?.parts?.[0]?.text) || "";
            if (!rawText.trim()) {
                throw new Error(`Empty response from model ${modelName}`);
            }

            const parsedArticle: SeoArticle = repairAndParseJson(rawText);
            const finalArticle = await refineArticleContent(parsedArticle);

            const imageProvider = getImageProvider();
            const imagesList: SeoImageItem[] = [];

            // 1. Featured / Cover Image Pipeline (ARTICLE_HERO)
            try {
                const coverSceneBrief = buildSceneBrief(
                    finalArticle.title || topic,
                    'Ảnh bìa đại diện sản phẩm',
                    finalArticle.metaDescription || topic,
                    { ...settings, visualPurpose: 'article_hero', productPriority: 'primary_subject' }
                );

                const dynamicCoverPrompt = buildDynamicImagePrompt(coverSceneBrief, settings?.imageStyle);
                const relevance = evaluateRelevance(dynamicCoverPrompt, coverSceneBrief);
                const effectiveCoverPrompt = relevance.refinedPrompt || dynamicCoverPrompt;

                let coverImgUrl = '';
                try {
                    const result = await imageProvider.generateImage({
                        prompt: effectiveCoverPrompt,
                        sceneBrief: coverSceneBrief,
                        style: settings?.imageStyle,
                        aspectRatio: '16:9',
                        reference: settings?.referenceImage,
                    });
                    coverImgUrl = result.imageUrl;
                } catch (imgErr) {
                    console.warn("Cover image AI generation failed, using curated aesthetic stock:", imgErr);
                    const stockList = TASTEFUL_ADULT_WELLNESS_STOCK[coverSceneBrief.sceneType] || TASTEFUL_ADULT_WELLNESS_STOCK.product_hero;
                    coverImgUrl = stockList[0];
                }

                finalArticle.imageUrl = coverImgUrl;
                imagesList.push({
                    src: coverImgUrl,
                    alt: coverSceneBrief.altTextSuggestion,
                    caption: coverSceneBrief.captionSuggestion || coverSceneBrief.altTextSuggestion,
                    name: `${coverSceneBrief.seoFilenameSlug}-cover`,
                    type: 'Ảnh bìa đại diện (Cover Hero)',
                    sceneType: coverSceneBrief.sceneType,
                    productName: coverSceneBrief.productName,
                });
            } catch (coverErr) {
                console.warn("Lỗi tạo ảnh bìa:", coverErr);
                finalArticle.imageUrl = TASTEFUL_ADULT_WELLNESS_STOCK.product_hero[0];
            }

            // 2. In-content Images Pipeline with Contextual Section Parsing
            const contentWithPrompts = finalArticle.content;
            const promptRegex = /\[PROMPT:\s*(.*?)\s*\]/g;
            const prompts = [...contentWithPrompts.matchAll(promptRegex)];
            
            if (prompts.length > 0) {
                // Process up to 3 contextual section illustrations
                const imageResults = await Promise.all(prompts.slice(0, 3).map(async (match, idx) => {
                    const matchIndex = match.index || 0;
                    // Extract surrounding context (before and after the tag)
                    const precedingText = contentWithPrompts.substring(Math.max(0, matchIndex - 500), matchIndex);
                    
                    // Extract closest H2 or H3 heading
                    const headingMatch = precedingText.match(/<h[23][^>]*>(.*?)<\/h[23]>/i);
                    const sectionTitle = headingMatch ? headingMatch[1].replace(/<[^>]+>/g, '') : `Section ${idx + 1}`;
                    
                    // Extract paragraph
                    const paragraphMatch = precedingText.match(/<p[^>]*>(.*?)<\/p>/gi);
                    const lastParagraph = paragraphMatch && paragraphMatch.length > 0 ? paragraphMatch[paragraphMatch.length - 1].replace(/<[^>]+>/g, '') : '';

                    const sectionSceneBrief = buildSceneBrief(
                        finalArticle.title || topic,
                        sectionTitle,
                        lastParagraph,
                        { ...settings, visualPurpose: 'section_illustration' }
                    );

                    const sectionPrompt = buildDynamicImagePrompt(sectionSceneBrief, settings?.imageStyle);
                    const relevance = evaluateRelevance(sectionPrompt, sectionSceneBrief);
                    const effectivePrompt = relevance.refinedPrompt || sectionPrompt;

                    let finalImgUrl = '';
                    try {
                        const res = await imageProvider.generateImage({
                            prompt: effectivePrompt,
                            sceneBrief: sectionSceneBrief,
                            style: settings?.imageStyle,
                            aspectRatio: '16:9',
                            reference: settings?.referenceImage,
                        });
                        finalImgUrl = res.imageUrl;
                    } catch (genErr) {
                        console.warn(`Section image ${idx + 1} generation failed, using curated aesthetic stock:`, genErr);
                        const stockList = TASTEFUL_ADULT_WELLNESS_STOCK[sectionSceneBrief.sceneType] || TASTEFUL_ADULT_WELLNESS_STOCK.product_editorial;
                        finalImgUrl = stockList[idx % stockList.length];
                    }

                    const seoName = `${sectionSceneBrief.seoFilenameSlug}-section-${idx + 1}`;

                    imagesList.push({
                        src: finalImgUrl,
                        alt: sectionSceneBrief.altTextSuggestion,
                        caption: sectionSceneBrief.captionSuggestion || sectionSceneBrief.altTextSuggestion,
                        name: seoName,
                        type: `Ảnh minh họa: ${sectionTitle}`,
                        sceneType: sectionSceneBrief.sceneType,
                        productName: sectionSceneBrief.productName,
                    });

                    return {
                        originalPrompt: match[0],
                        imageUrl: finalImgUrl,
                        altText: sectionSceneBrief.altTextSuggestion,
                        caption: sectionSceneBrief.captionSuggestion || sectionSceneBrief.altTextSuggestion,
                    };
                }));
                
                let finalContent = contentWithPrompts;
                for (const result of imageResults) {
                    if (result.imageUrl) {
                        const imgTag = `<div class='my-10'>
                            <img src='${result.imageUrl}' alt='${result.altText.replace(/'/g, "&#39;")}' class='w-full rounded-2xl shadow-2xl border border-slate-700' referrerPolicy='no-referrer' />
                            <p class='text-center text-sm text-slate-400 mt-3 italic'>${result.caption}</p>
                        </div>`;
                        finalContent = finalContent.replace(result.originalPrompt, imgTag);
                    } else {
                        finalContent = finalContent.replace(result.originalPrompt, "");
                    }
                }
                finalContent = finalContent.replace(promptRegex, "");
                finalArticle.content = finalContent;
            }

            finalArticle.imagesList = imagesList;
            return finalArticle;
        } catch (e) {
            console.warn(`Attempt with model ${modelName} failed:`, e);
            lastError = e;
        }
    }

    console.error("Gemini API Error across all attempts:", lastError);
    throw new Error("Lỗi sáng tạo nội dung. Có thể chủ đề vi phạm chính sách an toàn nghiêm ngặt hoặc kết nối bị gián đoạn. Vui lòng bấm thử lại.");
}
