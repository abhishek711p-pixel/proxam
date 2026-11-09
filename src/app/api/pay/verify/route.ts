import { currentUser } from "@/lib/auth";
import { body, fail, ok, str } from "@/lib/http";
import { checkoutSignatureOk, fulfillOrder, nextAfter, orderOf } from "@/lib/payments";

/** Browser sends this right after Razorpay Checkout succeeds. */
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return fail("session", 401);
  const b = await body(req);
  const orderId = str(b.razorpay_order_id, 64);
  const paymentId = str(b.razorpay_payment_id, 64);
  const signature = str(b.razorpay_signature, 200);

  const order = orderId ? await orderOf(orderId) : undefined;
  if (!order || order.user_id !== user.id) return fail("Payment not found.");
  if (!checkoutSignatureOk(orderId, paymentId, signature)) return fail("Payment could not be verified. If money was taken, it will be refunded or added within a few minutes.");

  const r = await fulfillOrder(orderId, paymentId);
  if (r.status === "needs_refund") return fail("You are already in this batch. This payment will be refunded to you.");
  return ok({ next: nextAfter(r.kind) });
}
