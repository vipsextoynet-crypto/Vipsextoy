import { NextRequest, NextResponse } from "next/server";
import { addOrder } from "@/lib/orders";
import { notifyOrderByEmail } from "@/lib/notify-order";

// QUAN TRONG - doc truoc khi deploy that:
// addOrder() ghi vao data/orders.json, CHI hoat dong khi chay tren server co
// o dia that (may ban, VPS...). Tren Vercel (serverless), ghi file nay se
// LOI hoac bi mat sau khi function ket thuc - vi vay ham nay luon thu ca 2
// cach (ghi file + gui email qua notifyOrderByEmail), va CHI bao loi that su
// cho khach khi CA HAI deu that bai - tranh tinh trang khach thay "dat hang
// thanh cong" nhung don hang khong duoc luu o dau ca.
//
// -> Xem huong dan bat email trong src/lib/notify-order.ts. Sau khi bat
// email, moi don hang tren Vercel se ve thang email ban, khong phu thuoc
// data/orders.json nua.

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { items, customer, payment, total } = body ?? {};

  if (!items?.length || !customer?.name || !customer?.phone || !customer?.address) {
    return NextResponse.json(
      { error: "Thiếu thông tin đơn hàng." },
      { status: 400 }
    );
  }

  const orderId = `VX${Date.now().toString().slice(-8)}`;
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
    addOrder(order);
    savedToFile = true;
  } catch (e) {
    console.error(`[checkout] Không ghi được data/orders.json cho đơn ${orderId}:`, e);
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
