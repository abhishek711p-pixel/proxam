import { isAdmin } from "@/lib/auth";
import { BRAND } from "@/lib/config";
import { mcAudience } from "@/lib/masterclass";
import { allMasterclasses, saveMasterclass } from "@/lib/store";
import { fail, ok } from "@/lib/http";
import { createCalendarEvent, googleMode } from "@/lib/integrations/google";

/** Put the masterclass on the connected Google Calendar with a Meet link. */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return fail("Unauthorised", 401);
  const { id } = await params;
  const found = (await allMasterclasses()).find((x) => x.id === id);
  const m = found && { ...found };
  if (!m) return fail("Not found", 404);
  if (!(await googleMode())) return fail("Connect Google Calendar first (Admin > Calendar).");
  try {
    const ev = await createCalendarEvent({
      requestId: `${m.id}-${Date.now()}`,
      title: `${BRAND} masterclass (${mcAudience(m)}): ${m.title}`,
      description: m.desc,
      start: m.startsAt,
      minutes: m.minutes,
      withMeet: true,
    });
    if (!ev.meetLink) return fail("Google did not return a Meet link.");
    m.meetingLink = ev.meetLink;
    m.calendarEventId = ev.eventId;
    await saveMasterclass(m);
    return ok({ link: ev.meetLink });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Could not create the Meet link.");
  }
}
