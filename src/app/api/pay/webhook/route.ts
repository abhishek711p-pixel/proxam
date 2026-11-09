import { NextResponse } from "next/server";
import { fulfillOrder, orderOf, webhookSignatureOk } from "@/lib/payments";

// Razorpay dashboard > Settings > Webhooks: URL https://proxam.in/api/pay/webhook,
// events "payment.captured" and "order.paid", secret = RAZORPAY_WEBHOOK_SECRET.
// Catches payments where the student closed the tab before /api/pay/verify ran.
type Hook = {
  event?: string;
  payload?: { payment?: { entity?: { id?: string; order_id?: string; amount?: number; status?: string } } };
};

export async function POST(req: Request) {
  const raw = await req.text();
  if (!webhookSignatureOk(raw, req.headers.get("x-razorpay-signature") || "")) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  let hook: Hook = {};
  try {
    hook = JSON.parse(raw) as Hook;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const p = hook.payload?.payment?.entity;
  if ((hook.event === "payment.captured" || hook.event === "order.paid") && p?.id && p.order_id) {
    const order = await orderOf(p.order_id);
    // Only our own orders, and only for the full amount we asked for.
    if (order && Math.round(order.amount * 100) === p.amount) await fulfillOrder(p.order_id, p.id);
  }
  return NextResponse.json({ ok: true }); // 200 so Razorpay does not retry
}
