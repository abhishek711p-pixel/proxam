import { currentUser } from "@/lib/auth";
import { nowISO } from "@/lib/ids";
import { fail, ok } from "@/lib/http";
import { onCancelled } from "@/lib/bookingHooks";
import { getBooking, saveBooking } from "@/lib/store";

// Student cancels their own booking.
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return fail("session", 401);
  const { id } = await params;
  const b = await getBooking(id);
  if (!b || b.userId !== user.id) return fail("Not found", 404);
  if (b.status !== "booked") return fail("This call can't be cancelled.");
  b.status = "cancelled";
  b.updatedAt = nowISO();
  await saveBooking(b);
  await onCancelled(b, user, { notify: true });
  return ok();
}
