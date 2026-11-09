import { currentUser } from "@/lib/auth";
import { activeEnrollment, demoPayments, paymentsEnabled } from "@/lib/batch";
import { batchLabel, batchOptions, batchPrice, type BatchField } from "@/lib/batches";
import { newId, nowISO } from "@/lib/ids";
import { addEnrollment, hit } from "@/lib/store";
import { createOrder } from "@/lib/payments";
import { fail, ok } from "@/lib/http";

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return fail("session", 401);
  if (!user.profile) return fail("Please complete your profile first.");
  if (activeEnrollment(user)) return ok({ next: "/dashboard" });
  // Which batch: Class 12 Science picks one of four (JEE, NEET, Boards PCM, Boards PCB); others have one
  const want = ((await req.json().catch(() => ({}))) as { batch?: string }).batch;
  const opts = batchOptions(user.profile.cls, user.profile.field);
  const batch = (want && opts.includes(want as BatchField) ? want : opts.length === 1 ? opts[0] : "") as BatchField;
  if (!batch) return fail("Pick your batch first.");

  const amount = batchPrice(user.profile.cls, batch); // price is decided on the server from the batch, never by the browser

  if (paymentsEnabled()) {
    // Razorpay: make an order; the batch is added only after the payment is verified (/api/pay/verify or webhook).
    if (!(await hit(`pay:${user.id}`, 10, 60_000))) return fail("Please wait a moment and try again.");
    try {
      const pay = await createOrder(user, { kind: "batch", ref: batch, cls: user.profile.cls, amount, description: batchLabel(user.profile.cls, batch) });
      return ok({ pay });
    } catch (e) {
      return fail((e as Error).message);
    }
  }
  if (!demoPayments()) return fail("Online payment is being set up. Please try again soon.");

  // Demo mode: no gateway configured, enrol without charging.
  // The database allows one active batch per student, so a double click cannot enrol twice.
  await addEnrollment(user.id, {
      id: newId("e_"),
      amount,
      paidAt: nowISO(),
      mode: "demo",
      cls: user.profile.cls,
      field: batch,
  });
  return ok({ next: "/batch" });
}
