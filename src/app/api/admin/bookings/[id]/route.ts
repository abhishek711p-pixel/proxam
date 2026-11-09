import { isAdmin } from "@/lib/auth";
import { nowISO } from "@/lib/ids";
import { getBooking, getUser, saveBooking } from "@/lib/store";
import { body, fail, ok, str } from "@/lib/http";
import type { BookingStatus } from "@/lib/types";
import { onCancelled, onLinkAdded } from "@/lib/bookingHooks";

const STATUSES: BookingStatus[] = ["booked", "attended", "no_show", "cancelled"];

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return fail("Unauthorised", 401);
  const { id } = await params;
  const b = await getBooking(id);
  if (!b) return fail("Not found", 404);
  const x = await body(req);
  const before = { status: b.status, link: b.meetingLink };
  if (typeof x.status === "string" && STATUSES.includes(x.status as BookingStatus)) b.status = x.status as BookingStatus;
  if (typeof x.meetingLink === "string") {
    const link = str(x.meetingLink, 300);
    if (link && !/^https:\/\//.test(link)) return fail("Meeting link must start with https://");
    b.meetingLink = link || undefined;
    if (link !== (before.link || "")) b.linkSource = link ? "manual" : undefined;
  }
  if (typeof x.notes === "string") b.notes = str(x.notes, 5000);
  if (typeof x.outcome === "string") b.outcome = str(x.outcome, 60);
  b.updatedAt = nowISO();
  await saveBooking(b);

  const user = await getUser(b.userId);
  if (before.status === "booked" && b.status === "cancelled") await onCancelled(b, user, { notify: true });
  else if (b.status === "booked" && b.meetingLink && b.meetingLink !== before.link) await onLinkAdded(b, user);
  return ok();
}
