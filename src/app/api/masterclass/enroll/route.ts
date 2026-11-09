import { currentUser } from "@/lib/auth";
import { paymentsEnabled } from "@/lib/batch";
import { nowISO } from "@/lib/ids";
import { addSeat, allMasterclasses } from "@/lib/store";
import { fail, ok } from "@/lib/http";
import { mcIsOver, mcMatches } from "@/lib/masterclass";

/** Take a seat in a masterclass. Only one meant for the student's own class and stream. */
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return fail("session", 401);
  if (!user.profile) return fail("Please complete your profile first.");
  const { id } = (await req.json().catch(() => ({}))) as { id?: string };

  const m = (await allMasterclasses()).find((x) => x.id === id);
  if (!m || m.status !== "scheduled" || mcIsOver(m)) return fail("This masterclass is not open for booking.");
  if (!mcMatches(m, user.profile)) return fail("This masterclass is for a different class or stream.");

  if ((user.masterclassSeats || []).some((s) => s.masterclassId === m.id)) return ok({ already: true });

  if (paymentsEnabled()) {
    // TODO (Phase 2): Razorpay order for m.price, verify in webhook, then add the seat with mode "razorpay".
    return fail("Online payment is not connected yet.");
  }
  // Demo mode: no gateway configured, add the seat without charging.
  await addSeat(user.id, { masterclassId: m.id, amount: m.price, paidAt: nowISO(), mode: "demo" });
  return ok({ enrolled: true });
}
