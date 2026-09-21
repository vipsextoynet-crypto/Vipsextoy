import { NextResponse } from "next/server";
import { countPendingDrafts, publishSite } from "@/lib/github-commit";

// /api/admin/* da duoc middleware.ts bao ve bang dang nhap admin.
export const dynamic = "force-dynamic";

// Dem so thay doi da luu nhung chua dang len web.
export async function GET() {
  try {
    const pending = await countPendingDrafts();
    return NextResponse.json({ pending });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

// Bam "Cap nhat len web": tao 1 commit thuong -> Vercel build 1 lan.
export async function POST() {
  try {
    await publishSite();
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          "Không đăng được lên web. Kiểm tra GITHUB_TOKEN / GITHUB_REPO / GITHUB_BRANCH. Chi tiết: " +
          (err instanceof Error ? err.message : String(err)),
      },
      { status: 500 }
    );
  }
}
