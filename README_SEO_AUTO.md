# Tự động đăng bài SEO hằng ngày (19h tối)

## Cách hoạt động
1. Mỗi ngày lúc **19:00 giờ Việt Nam** (12:00 UTC), GitHub Actions tự chạy
   `scripts/generate-daily-post.mjs`.
2. Script chọn 1 chủ đề chưa dùng trong `scripts/seo-topics.json` (33 chủ đề
   lấy từ dự án `vietnamese-sexual-wellness-seo-ai` bạn gửi), gọi Gemini API
   viết bài ~450-650 từ, rồi ghi vào đầu file `src/data/blog-posts.json`.
3. Workflow tự `git commit` + `git push` — Vercel đang theo dõi nhánh
   `main` nên sẽ tự động build & deploy bản mới, bài viết lên web trong
   vài phút mà bạn không cần làm gì thêm.

## Bạn cần làm (1 lần duy nhất)
1. Đẩy toàn bộ project này lên GitHub repo của bạn (repo đang dùng để
   deploy Vercel).
2. Vào repo trên GitHub → **Settings → Secrets and variables → Actions →
   New repository secret**:
   - Name: `GEMINI_API_KEY`
   - Value: API key Gemini của bạn (lấy tại https://aistudio.google.com/apikey)
3. Xong — không cần cấu hình gì thêm trên Vercel, vì Vercel chỉ cần thấy
   nhánh `main` có commit mới là tự deploy (mặc định khi bạn "Import" repo
   vào Vercel).

## Cách kiểm tra thử trước khi tin tưởng chạy tự động
Vào tab **Actions** trên GitHub → chọn workflow "Đăng bài SEO tự động hằng
ngày" → bấm **Run workflow** để chạy thử ngay lập tức (không cần đợi đến
19h), xem bài viết được tạo ra có ổn không.

## Lưu ý quan trọng
- **Giờ chạy không tuyệt đối chính xác**: GitHub Actions cron có thể trễ
  vài phút (đôi khi hơn) so với giờ hẹn, đặc biệt giờ cao điểm — đây là
  giới hạn chung của GitHub, không phải lỗi cấu hình.
- **33 chủ đề / 30 ngày**: sau khi dùng hết 33 chủ đề, hệ thống tự quay
  vòng dùng lại từ đầu (bài mới vẫn khác bài cũ vì AI viết lại). Muốn có
  nội dung mới hoàn toàn dài hạn hơn, thêm chủ đề vào
  `scripts/seo-topics.json` theo đúng format có sẵn.
- **An toàn nội dung**: mình cố tình viết lại prompt hệ thống theo đúng
  tinh thần "không mô tả hành vi tình dục, không ngôn ngữ khiêu dâm" như
  trong dự án gốc bạn gửi, và KHÔNG tắt bộ lọc an toàn của Gemini (dự án
  gốc có set `BLOCK_NONE` cho tất cả hạng mục — mình giữ nguyên mặc định
  để có thêm 1 lớp bảo vệ tự động cho pipeline chạy không người duyệt).
  Vẫn nên occasionally đọc lại vài bài đã đăng để yên tâm.
- Muốn có bước duyệt bài trước khi lên web (thay vì tự đăng thẳng), nói
  mình chỉnh workflow để tạo Pull Request thay vì push thẳng vào `main`.
