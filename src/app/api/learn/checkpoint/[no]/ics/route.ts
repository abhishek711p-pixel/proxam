import { BRAND } from "@/lib/config";
import { fail } from "@/lib/http";
import { checkpointDate, planOf } from "@/lib/learn";
import { batchStudent } from "@/lib/learnGuard";

const ymd = (t: number) => new Date(t + 5.5 * 3600_000).toISOString().slice(0, 10).replace(/-/g, "");

/** All-day calendar entry for a checkpoint test, with a reminder the evening before. */
export async function GET(_req: Request, { params }: { params: Promise<{ no: string }> }) {
  const s = await batchStudent();
  if (!s) return fail("session", 401);
  const n = Number((await params).no);
  const d = checkpointDate(s.u, s.enr, n, planOf(await s.scope(), s.u));
  if (!d) return fail("Not found", 404);
  const site = process.env.SITE_URL || "http://localhost:3000";
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//${BRAND}//Checkpoint//EN`,
    "BEGIN:VEVENT",
    `UID:cp${n}-${s.u.id}@${BRAND.toLowerCase()}`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")}`,
    `DTSTART;VALUE=DATE:${ymd(d)}`,
    `DTEND;VALUE=DATE:${ymd(d + 86_400_000)}`,
    `SUMMARY:${BRAND} Checkpoint ${String(n).padStart(2, "0")}`,
    `DESCRIPTION:Take the test any time today: ${site}/dashboard?tab=tests`,
    "BEGIN:VALARM",
    "TRIGGER:-PT6H",
    "ACTION:DISPLAY",
    `DESCRIPTION:${BRAND} checkpoint test today`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  return new Response(ics, { headers: { "content-type": "text/calendar; charset=utf-8", "content-disposition": `attachment; filename="checkpoint-${n}.ics"` } });
}
