import { NextRequest, NextResponse } from "next/server";
import { addOrder } from "@/lib/orders";
import { notifyOrderByEmail } from "@/lib/notify-order";

// QUAN TRONG - doc truoc khi deploy that:
// addOrder() luu don hang qua Vercel Blob (xem src/lib/orders.ts) - can bien
// moi truong BLOB_READ_WRITE_TOKEN (bat trong Vercel -> Storage -> tao Blob
// va Connect vao project). Khi chay local chua co bien nay, tu dong fallback
// ve file data/orders.json de tien test.
//
// Ham nay van luon thu CA 2 cach (luu don + gui email qua
// notifyOrderByEmail), va CHI bao loi thuc su cho khach khi CA HAI deu that
// bai - tranh tinh trang khach thay "dat hang thanh cong" nhung don hang
// khong duoc luu o dau ca.

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { items, customer, payment, total, orderId: clientOrderId } = body ?? {};

  if (!items?.length || !customer?.name || !customer?.phone || !customer?.address) {
    return NextResponse.json(
      { error: "Thiếu thông tin đơn hàng." },
      { status: 400 }
    );
  }

  // Chuyen khoan: dung ma don khach da thay trong QR (noi dung chuyen khoan) de
  // shop doi chieu sao ke. Chi nhan dung dinh dang VX + 8 chu so, con lai tu sinh.
  const orderId =
    payment === "bank" && typeof clientOrderId === "string" && /^VX\d{8}$/.test(clientOrderId)
      ? clientOrderId
      : `VX${Date.now().toString().slice(-8)}`;
  const order = {
    orderId,
    createdAt: new Date().toISOString(),
    items,
    customer,
    payment,
    total,
  };

  let savedToFile = false;
  try {
    await addOrder(order);
    savedToFile = true;
  } catch (e) {
    console.error(`[checkout] Không lưu được đơn ${orderId}:`, e);
  }

  const emailedOk = await notifyOrderByEmail(order);

  if (!savedToFile && !emailedOk) {
    // Ca 2 cach luu don deu that bai - BAO LOI THAT cho khach, khong gia vo
    // thanh cong, vi don hang nay se bi mat neu tra ve orderId luc nay.
    console.error(`[checkout] MẤT ĐƠN HÀNG ${orderId} - không lưu file, không gửi được email. Nội dung đơn:`, order);
    return NextResponse.json(
      {
        error:
          "Hệ thống đang gặp sự cố lưu đơn hàng, vui lòng gọi hotline để đặt hàng trực tiếp thay vì đặt lại.",
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ orderId });
}
