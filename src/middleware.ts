import { NextRequest, NextResponse } from "next/server";

// Bảo vệ mọi đường dẫn /admin/* bằng đăng nhập cơ bản (Basic Auth).
// Đặt mật khẩu thật trong file .env.local (không commit lên git):
//   ADMIN_USER=vipextoy
//   ADMIN_PASSWORD=doi-mat-khau-nay
export function middleware(req: NextRequest) {
  const user = process.env.ADMIN_USER || "admin";
  const pass = process.env.ADMIN_PASSWORD || "vipextoy2026";

  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Basic ")) {
    const decoded = Buffer.from(auth.slice(6), "base64").toString();
    const [u, p] = decoded.split(":");
    if (u === user && p === pass) {
      return NextResponse.next();
    }
  }

  return new NextResponse("Yêu cầu đăng nhập để xem trang quản trị.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Vipsextoy Admin"' },
  });
}

export const config = {
  matcher: ["/admin/:path*"],
};
