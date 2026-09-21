// Gui email thong bao don hang moi qua Resend (https://resend.com).
//
// VI SAO CAN FILE NAY: tren Vercel, ghi file (data/orders.json) KHONG hoat
// dong on dinh - o dia serverless la tam thoi/chi doc, don hang co the bi
// mat ma khong bao gio bao loi cho ban biet. Email la cach don gian nhat de
// dam bao ban luon nhan duoc don hang that, khong can dung them database.
//
// CACH BAT TINH NANG NAY:
// 1) Dang ky mien phi tai https://resend.com (mien phi ~3,000 email/thang).
// 2) Lay API key tai https://resend.com/api-keys
// 3) Vao Vercel -> Project Settings -> Environment Variables, them:
//      RESEND_API_KEY = <key vua lay>
//      ORDER_NOTIFY_EMAIL = <email ban muon nhan don hang, vd cua ban>
// 4) Deploy lai. Tu do moi don hang se tu gui email ve dia chi tren.
//
// Neu CHUA cau hinh RESEND_API_KEY: ham nay se bo qua (khong gui email,
// khong bao loi) - don hang van duoc ghi vao data/orders.json nhu cu (chi
// hoat dong khi chay o may ban / server co o dia that, KHONG hoat dong tren
// Vercel - xem ghi chu trong src/lib/orders.ts).

import type { Order } from "./orders";

// Chong chen ma HTML tu du lieu khach nhap vao noi dung email.
function esc(v: unknown): string {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function notifyOrderByEmail(order: Order): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.ORDER_NOTIFY_EMAIL;
  if (!apiKey || !to) return false;

  const isBank = order.payment === "bank";
  const totalText = `${order.total.toLocaleString("vi-VN")}đ`;

  const itemsHtml = order.items
    .map(
      (it) =>
        `<tr><td style="padding:4px 8px">${esc(it.name)}</td><td style="padding:4px 8px">x${esc(it.qty)}</td><td style="padding:4px 8px">${it.price.toLocaleString("vi-VN")}đ</td></tr>`
    )
    .join("");

  const bankBox = isBank
    ? `<div style="border:2px solid #e6007e;padding:10px 14px;margin:10px 0">
         <b>CHUYỂN KHOẢN — CẦN ĐỐI CHIẾU TRƯỚC KHI GIAO</b><br/>
         Khách đã quét QR và bấm gửi đơn. Hãy kiểm tra app ngân hàng xem có khoản
         <b>${totalText}</b> với nội dung <b>${esc(order.orderId)}</b> chưa.
       </div>`
    : "";

  const html = `
    <h2>Đơn hàng mới: ${esc(order.orderId)}</h2>
    ${bankBox}
    <p><b>Khách hàng:</b> ${esc(order.customer.name)} - ${esc(order.customer.phone)}</p>
    <p><b>Địa chỉ:</b> ${esc(order.customer.address)}</p>
    ${order.customer.note ? `<p><b>Ghi chú:</b> ${esc(order.customer.note)}</p>` : ""}
    <p><b>Thanh toán:</b> ${isBank ? "Chuyển khoản (chờ đối chiếu)" : "COD"}</p>
    <table border="1" cellspacing="0">${itemsHtml}</table>
    <p><b>Tổng cộng: ${totalText}</b></p>
  `;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Đơn hàng Vipsextoy <onboarding@resend.dev>",
        to: [to],
        subject: `${isBank ? "[CK - đối chiếu] " : "[COD] "}Đơn hàng mới #${order.orderId} - ${totalText}`,
        html,
      }),
    });
    return res.ok;
  } catch (e) {
    console.error("Gửi email thông báo đơn hàng thất bại:", e);
    return false;
  }
}
