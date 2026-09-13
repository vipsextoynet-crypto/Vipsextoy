# Vipextoy — Website bán hàng trực tuyến

Website được xây bằng **Next.js 14 + TypeScript + Tailwind CSS**. Có sẵn:

- Trang chủ, trang danh mục sản phẩm, trang chi tiết sản phẩm
- Giỏ hàng (lưu trên trình duyệt, không mất khi tải lại trang)
- Trang thanh toán (COD / chuyển khoản) + trang xác nhận đơn hàng
- Cổng xác nhận độ tuổi 18+
- Icon sản phẩm dạng hình khối trừu tượng (không dùng ảnh thật) — bạn có thể
  thay bằng ảnh sản phẩm thật của mình sau

## 1. Chạy thử trên máy (tuỳ chọn)

```bash
npm install
npm run dev
```

Mở `http://localhost:3000`.

## 2. Đưa code lên GitHub

Trong thư mục dự án:

```bash
git init
git add .
git commit -m "Khởi tạo website vipextoy"
git branch -M main
git remote add origin https://github.com/<ten-tai-khoan-cua-ban>/vipextoy.git
git push -u origin main
```

> Nếu chưa có repo trên GitHub: vào github.com → **New repository** → đặt tên
> `vipextoy` → **Create repository** (không cần tick "Add README") → GitHub sẽ
> hiện đúng 5 dòng lệnh ở trên cho bạn copy.

## 3. Deploy lên Vercel

1. Vào **vercel.com** → đăng nhập bằng tài khoản GitHub của bạn.
2. Bấm **Add New → Project**.
3. Chọn repo `vipextoy` vừa push → bấm **Import**.
4. Vercel tự nhận diện đây là dự án Next.js, không cần chỉnh gì thêm.
5. Bấm **Deploy**. Sau ~1–2 phút, bạn sẽ có link dạng
   `https://vipextoy-xxxx.vercel.app`.

### Gắn tên miền vipextoy.com

1. Trong project trên Vercel → tab **Settings → Domains**.
2. Nhập `vipextoy.com` → **Add**.
3. Vercel sẽ đưa ra 1–2 bản ghi DNS (thường là bản ghi `A` trỏ về một IP, và/hoặc
   `CNAME` cho `www`).
4. Vào nơi bạn mua domain (Matbao, PA Vietnam, GoDaddy, Namecheap...) → mục
   quản lý DNS → thêm đúng các bản ghi Vercel đưa ra.
5. Chờ 5–30 phút để DNS cập nhật, Vercel sẽ tự cấp SSL (https) miễn phí.

Từ lần sau, mỗi khi bạn `git push` lên nhánh `main`, Vercel **tự động build và
deploy lại** — không cần làm lại các bước trên.

## 4. Việc cần làm tiếp theo trước khi bán hàng thật

- **Thanh toán:** hiện tại đơn hàng chỉ được ghi log tại
  `src/app/api/checkout/route.ts`. Trước khi vận hành thật, bạn nên nối một
  trong các cổng sau vào đúng vị trí `TODO` trong file đó:
  - VNPay / MoMo (phổ biến với khách Việt Nam, hỗ trợ cả chuyển khoản & ví)
  - Stripe Checkout (nếu bán quốc tế / nhận thẻ Visa/Mastercard)
- **Lưu đơn hàng:** nối thêm một database (ví dụ Supabase, Google Sheet qua
  API, hoặc gửi email/Slack) để bạn không bỏ lỡ đơn nào — hiện đơn chỉ nằm
  trong log server.
- **Ảnh sản phẩm thật:** thay icon trừu tượng trong
  `src/components/ProductGlyph.tsx` bằng ảnh thật của bạn (đặt trong thư mục
  `public/`) nếu muốn.
- **Sản phẩm:** chỉnh sửa danh sách sản phẩm, giá, mô tả trong
  `src/data/products.ts`.
- **Tên hiển thị giao dịch (sao kê ngân hàng):** khi đăng ký cổng thanh toán,
  đặt tên hiển thị giao dịch trung lập (VD: "CTY TNHH ABC") để giữ tính riêng
  tư cho khách hàng, đúng như cam kết trên trang.

## Cấu trúc thư mục chính

```
src/
  app/            → các trang (routes) của Next.js App Router
    page.tsx        → trang chủ
    shop/           → trang danh sách sản phẩm
    product/[slug]/ → trang chi tiết sản phẩm
    checkout/       → trang thanh toán
    success/        → trang xác nhận đơn hàng
    api/checkout/   → API nhận đơn hàng
  components/     → Header, Footer, giỏ hàng, thẻ sản phẩm, cổng 18+...
  data/products.ts→ dữ liệu sản phẩm mẫu (sửa trực tiếp tại đây)
  lib/cart-context.tsx → logic giỏ hàng
```
