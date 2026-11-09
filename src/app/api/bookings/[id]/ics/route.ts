import { currentUser } from "@/lib/auth";
import { getBooking } from "@/lib/store";
import { fail } from "@/lib/http";
import { CALL_MINUTES } from "@/lib/bookingHooks";
import { BRAND } from "@/lib/config";

// "Add to my calendar": a standard .ics file that opens in Google Calendar, Apple Calendar and Outlook.
const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return fail("session", 401);
  const { id } = await params;
  const found = await getBooking(id);
  const b = found && found.userId === user.id && found.status === "booked" ? found : undefined;
  if (!b) return fail("Not found", 404);
  const start = new Date(b.slotStart);
  const end = new Date(start.getTime() + CALL_MINUTES * 60_000);
  const where = b.meetingLink || (b.platform === "zoom" ? "Zoom (link on your dashboard)" : "Google Meet (link on your dashboard)");
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//${BRAND}//Guidance call//EN`,
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${b.id}@${BRAND.toLowerCase()}`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${esc(`${BRAND} free guidance call`)}`,
    `DESCRIPTION:${esc(`Your free career guidance call.\nJoin: ${where}`)}`,
    `LOCATION:${esc(where)}`,
    "BEGIN:VALARM",
    "TRIGGER:-PT15M",
    "ACTION:DISPLAY",
    `DESCRIPTION:${esc(`${BRAND} guidance call in 15 minutes`)}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  return new Response(ics, {
    headers: { "content-type": "text/calendar; charset=utf-8", "content-disposition": `attachment; filename="guidance-call.ics"` },
  });
}
