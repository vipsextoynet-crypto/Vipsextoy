import { NextRequest, NextResponse } from "next/server";
import { addOrder } from "@/lib/orders";

// NOTE: This handler now saves orders to data/orders.json so you can view
// them at /admin/orders. To go live for real payments, you can still layer
// on top:
//  - VNPay / MoMo for local Vietnamese payment (bank/e-wallet)
//  - Stripe Checkout for international cards
//  - Email/Slack notification when a new order comes in

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

  addOrder({
    orderId,
    createdAt: new Date().toISOString(),
    items,
    customer,
    payment,
    total,
  });

  return NextResponse.json({ orderId });
}
