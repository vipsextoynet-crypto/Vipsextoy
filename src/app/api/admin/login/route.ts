import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME, createSessionToken } from "@/lib/admin-session";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const password = body?.password;

  const correct = process.env.ADMIN_PASSWORD || "vipextoy2026";

  if (!password || password !== correct) {
    return NextResponse.json(
      { error: "Sai mật khẩu." },
      { status: 401 }
    );
  }

  const token = await createSessionToken();
  const res = NextResponse.json({ ok: true });

  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12, // 12 gio, khop voi SESSION_HOURS trong admin-session.ts
  });

  return res;
}
