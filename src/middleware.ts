import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME, verifySessionToken } from "@/lib/admin-session";

// Bao ve moi duong dan /admin/* (tru trang /admin/login) bang session
// dang nhap (cookie ky HMAC). Neu chua dang nhap -> chuyen ve /admin/login.
// Dat mat khau thuc trong file .env.local (khong commit len git):
//   ADMIN_PASSWORD=doi-mat-khau-nay
//   ADMIN_SESSION_SECRET=mot-chuoi-bi-mat-dai-ngau-nhien
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname === "/admin/login" || pathname === "/api/admin/login") {
    return NextResponse.next();
  }

  const token = req.cookies.get(COOKIE_NAME)?.value;
  const ok = await verifySessionToken(token);

  if (!ok) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
    }
    const url = req.nextUrl.clone();
    url.pathname = "/admin/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
