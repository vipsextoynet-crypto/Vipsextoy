import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { getBlobAuthOptions } from "@/lib/blob-config";

// Upload 1 anh len Vercel Blob (khong dinh gi den GitHub/git, nen khong lam
// nang repo, khong gay build lai). Dung cho tinh nang tai anh theo thu muc
// trong trang admin.
export async function POST(req: NextRequest) {
  const authOptions = getBlobAuthOptions();

  if (!authOptions) {
    return NextResponse.json(
      { error: "Chưa bật Vercel Blob (thiếu BLOB_READ_WRITE_TOKEN hoặc chưa nối Blob store vào project)." },
      { status: 500 }
    );
  }

  const formData = await req.formData().catch(() => null);
  const file = formData?.get("file");
  const sku = (formData?.get("sku") as string) || "khac";

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "Không nhận được file." }, { status: 400 });
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `products/${sku}/${Date.now()}-${safeName}`;

  try {
    const blob = await put(path, file, {
      access: "public",
      addRandomSuffix: false,
      contentType: file.type || "image/jpeg",
      ...authOptions,
    });

    return NextResponse.json({ ok: true, url: blob.url, sku });
  } catch (err) {
    return NextResponse.json(
      { error: "Tải ảnh lên thất bại: " + (err instanceof Error ? err.message : String(err)) },
      { status: 500 }
    );
  }
}
