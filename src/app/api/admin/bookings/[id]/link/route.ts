import { isAdmin } from "@/lib/auth";
import { getBooking, getUser, saveBooking } from "@/lib/store";
import { body, fail, ok } from "@/lib/http";
import { createMeetingAndEvent, linkMessage, onLinkAdded } from "@/lib/bookingHooks";
import { deleteCalendarEvent, googleMode } from "@/lib/integrations/google";

// Admin > Calls > "Create Meet link": for bookings made before Google was connected,
// Zoom bookings while Zoom is not connected, or when the first try failed.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return fail("Unauthorised", 401);
  const { id } = await params;
  const b = await getBooking(id);
  if (!b) return fail("Not found", 404);
  if (b.status !== "booked") return fail("Only booked calls can get a link.");
  const user = await getUser(b.userId);
  if (!user) return fail("Student not found");
  if (!(await googleMode())) return fail("Connect Google Calendar first (Admin > Calendar).");

  const x = await body(req);
  const hadLink = b.meetingLink;
  const hadPlatform = b.platform;
  if (x.switchToMeet === true && b.platform !== "meet") {
    b.platform = "meet";
    // An event made earlier without Meet: replace it so the new one carries the Meet link.
    if (b.calendarEventId && !b.meetingLink) {
      try {
        await deleteCalendarEvent(b.calendarEventId);
      } catch {}
      b.calendarEventId = undefined;
    }
    await saveBooking(b);
  }
  const errors = await createMeetingAndEvent(b, user);
  if (!b.meetingLink) {
    b.platform = hadPlatform; // keep the student's choice if it did not work
    await saveBooking(b);
    return fail(errors.length ? errors.join(" | ") : "Google did not return a Meet link.");
  }
  if (b.meetingLink !== hadLink) await onLinkAdded(b, user);
  return ok({ link: b.meetingLink, message: linkMessage(b, user.profile?.name) });
}
