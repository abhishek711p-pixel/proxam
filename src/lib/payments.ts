import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { q1, tx, isUniqueViolation } from "./pg";
import { newId } from "./ids";
import type { User } from "./types";

// Razorpay: Orders API + Standard Checkout.
// 1. Server makes an order with the price decided here (never by the browser) and saves it in payment_orders.
// 2. Browser opens Razorpay Checkout for that order.
// 3. On success the browser sends the ids + signature to /api/pay/verify. The webhook (/api/pay/webhook)
//    does the same if the student closes the tab before step 3. Whichever comes first gives the item;
//    the second one finds the order already paid and does nothing.
// Keys: RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET (test keys start with rzp_test_, live with rzp_live_),
// RAZORPAY_WEBHOOK_SECRET (the secret you type when adding the webhook in the Razorpay dashboard).

export type PayKind = "batch" | "test" | "masterclass";

export interface PayOrder {
  key: string;
  orderId: string;
  amount: number; // paise
  currency: "INR";
  name: string;
  description: string;
  prefill: { name?: string; email?: string; contact?: string };
}

const API = process.env.RAZORPAY_API_URL || "https://api.razorpay.com/v1"; // override only for local tests

function auth() {
  return "Basic " + Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString("base64");
}

/** Create a Razorpay order for `amount` rupees and remember what it is for. */
export async function createOrder(user: User, item: { kind: PayKind; ref?: string; cls?: string; amount: number; description: string }): Promise<PayOrder> {
  const paise = Math.round(item.amount * 100);
  const res = await fetch(`${API}/orders`, {
    method: "POST",
    headers: { authorization: auth(), "content-type": "application/json" },
    body: JSON.stringify({
      amount: paise,
      currency: "INR",
      receipt: newId("r_").slice(0, 40),
      notes: { user_id: user.id, kind: item.kind, ref: item.ref || "" },
    }),
    cache: "no-store",
  });
  const data = (await res.json().catch(() => ({}))) as { id?: string; error?: { description?: string } };
  if (!res.ok || !data.id) {
    console.error("[razorpay] order failed", res.status, data.error?.description);
    throw new Error("Payment could not be started. Please try again.");
  }
  await q1(`insert into payment_orders (id, user_id, kind, ref, cls, amount) values ($1,$2,$3,$4,$5,$6)`, [
    data.id,
    user.id,
    item.kind,
    item.ref || null,
    item.cls || null,
    item.amount,
  ]);
  return {
    key: process.env.RAZORPAY_KEY_ID!,
    orderId: data.id,
    amount: paise,
    currency: "INR",
    name: "Proxam",
    description: item.description,
    prefill: { name: user.profile?.name, email: user.email || undefined, contact: user.mobile || undefined },
  };
}

function sameHex(a: string, b: string) {
  const x = Buffer.from(a, "utf8");
  const y = Buffer.from(b, "utf8");
  return x.length === y.length && timingSafeEqual(x, y);
}

/** Checkout success: signature = HMAC_SHA256(order_id + "|" + payment_id, key_secret). */
export function checkoutSignatureOk(orderId: string, paymentId: string, signature: string) {
  const want = createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "").update(`${orderId}|${paymentId}`).digest("hex");
  return Boolean(signature) && sameHex(want, signature);
}

/** Webhook: X-Razorpay-Signature = HMAC_SHA256(raw body, webhook secret). */
export function webhookSignatureOk(rawBody: string, signature: string) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  return sameHex(createHmac("sha256", secret).update(rawBody).digest("hex"), signature);
}

type OrderRow = { id: string; user_id: string; kind: PayKind; ref: string | null; cls: string | null; amount: number; status: string };

export async function orderOf(orderId: string) {
  return q1<OrderRow>(`select id, user_id, kind, ref, cls, amount, status from payment_orders where id = $1`, [orderId]);
}

/**
 * Give what was paid for. Safe to call twice (verify + webhook): only the call that flips
 * the order from "created" to "paid" adds the batch / test / seat. All in one transaction.
 */
export async function fulfillOrder(orderId: string, paymentId: string): Promise<{ kind?: PayKind; status: "done" | "already" | "needs_refund" | "unknown" }> {
  return tx(async (c) => {
    const o = await q1<OrderRow>(
      `update payment_orders set status = 'paid', payment_id = $2, paid_at = now()
       where id = $1 and status = 'created'
       returning id, user_id, kind, ref, cls, amount, status`,
      [orderId, paymentId],
      c,
    );
    if (!o) {
      const old = await q1<OrderRow>(`select kind, status from payment_orders where id = $1`, [orderId], c);
      if (!old) return { status: "unknown" };
      return { kind: old.kind, status: old.status === "needs_refund" ? "needs_refund" : "already" };
    }

    if (o.kind === "batch") {
      // A savepoint, so a duplicate (already has a batch) does not undo the "paid" mark above.
      await c.query("savepoint enrol");
      try {
        await c.query(
          `insert into enrollments (id, user_id, amount, paid_at, mode, payment_id, cls, field) values ($1,$2,$3,now(),'razorpay',$4,$5,$6)`,
          [newId("e_"), o.user_id, o.amount, paymentId, o.cls, o.ref],
        );
      } catch (e) {
        if (!isUniqueViolation(e)) throw e;
        await c.query("rollback to savepoint enrol");
        await c.query(`update payment_orders set status = 'needs_refund' where id = $1`, [o.id]);
        console.error("[razorpay] paid twice for a batch, refund needed", o.id, paymentId);
        return { kind: o.kind, status: "needs_refund" };
      }
    } else if (o.kind === "test") {
      await c.query(`insert into test_purchases (id, user_id, amount, paid_at, mode, payment_id) values ($1,$2,$3,now(),'razorpay',$4)`, [
        newId("tp_"),
        o.user_id,
        o.amount,
        paymentId,
      ]);
    } else if (o.kind === "masterclass") {
      await c.query(
        `insert into masterclass_seats (masterclass_id, user_id, amount, paid_at, mode, payment_id) values ($1,$2,$3,now(),'razorpay',$4) on conflict do nothing`,
        [o.ref, o.user_id, o.amount, paymentId],
      );
    }
    return { kind: o.kind, status: "done" };
  });
}

/** Where the student goes after paying. */
export function nextAfter(kind?: PayKind) {
  return kind === "batch" ? "/batch" : kind === "masterclass" ? "/masterclass" : kind === "test" ? "/test" : "/dashboard";
}
