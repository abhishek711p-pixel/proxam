"use client";
// Opens Razorpay Checkout for an order made on the server, then asks the server to verify it.
// Returns { ok: true, next } when the batch / test / seat has been added.

export type PayOrder = {
  key: string;
  orderId: string;
  amount: number;
  currency: "INR";
  name: string;
  description: string;
  prefill: { name?: string; email?: string; contact?: string };
};

type RzpResponse = { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string };
type RzpCtor = new (opts: Record<string, unknown>) => { open: () => void; on: (ev: string, fn: (r: unknown) => void) => void };

let loading: Promise<boolean> | null = null;
function loadScript() {
  if (typeof window !== "undefined" && (window as unknown as { Razorpay?: RzpCtor }).Razorpay) return Promise.resolve(true);
  loading ??= new Promise<boolean>((resolve) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.async = true;
    s.onload = () => resolve(true);
    s.onerror = () => {
      loading = null;
      resolve(false);
    };
    document.body.appendChild(s);
  });
  return loading;
}

export type PayResult = { ok: true; next: string } | { ok: false; error: string; cancelled?: boolean };

export async function payWithRazorpay(order: PayOrder): Promise<PayResult> {
  if (!(await loadScript())) return { ok: false, error: "Could not open the payment window. Check your internet and try again." };
  const Razorpay = (window as unknown as { Razorpay: RzpCtor }).Razorpay;

  const paid = await new Promise<RzpResponse | null>((resolve) => {
    const rzp = new Razorpay({
      key: order.key,
      order_id: order.orderId,
      amount: order.amount,
      currency: order.currency,
      name: order.name,
      description: order.description,
      prefill: order.prefill,
      theme: { color: "#3a4a2f" },
      handler: (r: RzpResponse) => resolve(r),
      modal: { ondismiss: () => resolve(null), confirm_close: true },
    });
    // A failed attempt keeps the window open so the student can retry; nothing to do here.
    rzp.open();
  });
  if (!paid) return { ok: false, cancelled: true, error: "Payment cancelled." };

  const r = await fetch("/api/pay/verify", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(paid),
  })
    .then((x) => x.json())
    .catch(() => null);
  if (r?.ok) return { ok: true, next: r.next };
  return { ok: false, error: r?.error || "Payment received but not confirmed yet. Refresh in a minute." };
}
