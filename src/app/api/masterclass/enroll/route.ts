import { currentUser } from "@/lib/auth";
import { demoPayments, paymentsEnabled } from "@/lib/batch";
import { nowISO } from "@/lib/ids";
import { addSeat, allMasterclasses, hit } from "@/lib/store";
import { createOrder } from "@/lib/payments";
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

  if (m.price <= 0) {
    await addSeat(user.id, { masterclassId: m.id, amount: 0, paidAt: nowISO(), mode: "admin" });
    return ok({ enrolled: true });
  }
  if (paymentsEnabled()) {
    if (!(await hit(`pay:${user.id}`, 10, 60_000))) return fail("Please wait a moment and try again.");
    try {
      const pay = await createOrder(user, { kind: "masterclass", ref: m.id, amount: m.price, description: `Masterclass: ${m.title}`.slice(0, 250) });
      return ok({ pay });
    } catch (e) {
      return fail((e as Error).message);
    }
  }
  if (!demoPayments()) return fail("Online payment is being set up. Please try again soon.");
  // Demo mode: no gateway configured, add the seat without charging.
  await addSeat(user.id, { masterclassId: m.id, amount: m.price, paidAt: nowISO(), mode: "demo" });
  return ok({ enrolled: true });
}
