import { currentUser } from "@/lib/auth";
import { activeEnrollment, paymentsEnabled } from "@/lib/batch";
import { batchOptions, batchPrice, type BatchField } from "@/lib/batches";
import { newId, nowISO } from "@/lib/ids";
import { addEnrollment } from "@/lib/store";
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

  if (paymentsEnabled()) {
    // TODO (Phase 2): create a Razorpay order here, return it to the browser,
    // open Razorpay Checkout, then verify the signature in a webhook and only
    // then create the enrollment below with mode "razorpay".
    return fail("Online payment is not connected yet.");
  }

  // Demo mode: no gateway configured, enrol without charging.
  // The database allows one active batch per student, so a double click cannot enrol twice.
  await addEnrollment(user.id, {
      id: newId("e_"),
      amount: batchPrice(user.profile.cls, batch), // price is decided on the server from the batch, never by the browser
      paidAt: nowISO(),
      mode: "demo",
      cls: user.profile.cls,
      field: batch,
  });
  return ok({ next: "/batch" });
}
