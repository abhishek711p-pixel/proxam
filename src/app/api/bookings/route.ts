import { currentUser } from "@/lib/auth";
import { newId, nowISO } from "@/lib/ids";
import { body, fail, ok, str } from "@/lib/http";
import { buildSlots, isBookable } from "@/lib/slots";
import { onBooked, onCancelled } from "@/lib/bookingHooks";
import { counsellorCapacity } from "@/lib/config";
import { bookSlot, userAttempts } from "@/lib/store";
import type { Booking } from "@/lib/types";

export async function GET() {
  const user = await currentUser();
  if (!user) return fail("session", 401);
  return ok({ days: await buildSlots() });
}

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return fail("session", 401);
  const lastResult = (await userAttempts(user.id))
    .filter((a) => a.status === "submitted")
    .sort((a, b) => (b.submittedAt || "").localeCompare(a.submittedAt || ""))[0];
  if (!lastResult) return fail("Take the test first, then book your call.");

  const b = await body(req);
  const slotStart = str(b.slotStart, 40);
  const platform = "meet" as const; // Google Meet only (Zoom option removed)
  if (!(await isBookable(slotStart))) return fail("This slot is no longer free. Please pick another.");

  const now = nowISO();
  const booking: Booking = {
    id: newId("b_"),
    userId: user.id,
    attemptId: lastResult.id,
    slotStart,
    platform,
    status: "booked",
    createdAt: now,
    updatedAt: now,
  };
  // Capacity is checked again inside the database lock: two students can never take the last seat together.
  const r = await bookSlot(booking, counsellorCapacity());
  if (!r.ok) return fail("This slot is no longer free. Please pick another.");

  // Old slot (if rescheduling): remove its calendar event / Zoom meeting, no SMS (the new confirmation covers it).
  if (r.old) await onCancelled(r.old, user, { notify: false });
  // Create Meet/Zoom link, put it on the team calendar, SMS the student.
  await onBooked(booking, user);
  return ok();
}
