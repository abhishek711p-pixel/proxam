import { currentUser } from "@/lib/auth";
import { allMasterclasses } from "@/lib/store";
import { fail } from "@/lib/http";
import { BRAND } from "@/lib/config";
import { mcEnd } from "@/lib/masterclass";

const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");

/** "Save to my calendar" for a masterclass the student has a seat in. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return fail("session", 401);
  const { id } = await params;
  const m = (await allMasterclasses()).find((x) => x.id === id);
  if (!m || !user.masterclassSeats?.some((s) => s.masterclassId === id)) return fail("Not found", 404);
  const site = process.env.SITE_URL || "http://localhost:3000";
  const where = m.meetingLink || `${site}/masterclass`;
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//${BRAND}//Masterclass//EN`,
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${m.id}@${BRAND.toLowerCase()}`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(new Date(m.startsAt))}`,
    `DTEND:${stamp(mcEnd(m))}`,
    `SUMMARY:${esc(`${BRAND} masterclass: ${m.title}`)}`,
    `DESCRIPTION:${esc(`${m.desc}\nJoin: ${where}`)}`,
    `LOCATION:${esc(where)}`,
    "BEGIN:VALARM",
    "TRIGGER:-PT30M",
    "ACTION:DISPLAY",
    `DESCRIPTION:${esc(`${BRAND} masterclass in 30 minutes`)}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  return new Response(ics, {
    headers: { "content-type": "text/calendar; charset=utf-8", "content-disposition": `attachment; filename="masterclass.ics"` },
  });
}
