import Link from "next/link";
import { bookingsBetween } from "@/lib/adminData";
import { FIELDS, classLabel } from "@/lib/config";
import { integrationStatus } from "@/lib/bookingHooks";
import { oauthRedirectUri } from "@/lib/integrations/google";
import { DisconnectGoogle } from "./GoogleConnect";

const dayKey = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date(iso));
const dayLabel = (key: string) =>
  new Date(`${key}T12:00:00+05:30`).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", timeZone: "Asia/Kolkata" });
const time = (iso: string) => new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });

const STATUS_STYLE: Record<string, string> = {
  booked: "bg-accent-100 text-accent-800",
  attended: "bg-brand-100 text-brand-700",
  no_show: "bg-rose-100 text-rose-700",
  cancelled: "bg-slate-200 text-slate-600 line-through",
};

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ week?: string; google?: string; msg?: string }> }) {
  const { week = "0", google: gFlash, msg } = await searchParams;
  const offset = Math.max(-52, Math.min(52, Number(week) || 0));
  const st = await integrationStatus();
  const g = st.google;

  // 7 days starting today (IST) + offset weeks
  const today = new Date(`${dayKey(new Date().toISOString())}T00:00:00+05:30`).getTime();
  const from = today + offset * 7 * 86400_000;
  const to = from + 7 * 86400_000;
  const days = Array.from({ length: 7 }, (_, i) => dayKey(new Date(from + i * 86400_000 + 3600_000).toISOString()));
  const rows = await bookingsBetween(new Date(from).toISOString(), new Date(to).toISOString());
  const users = new Map(rows.map((r) => [r.data.userId, { mobile: r.mobile, profile: r.profile || undefined }]));
  const inRange = rows.map((r) => r.data);
  const byDay = new Map<string, typeof inRange>();
  for (const b of inRange) byDay.set(dayKey(b.slotStart), [...(byDay.get(dayKey(b.slotStart)) || []), b]);
  const active = inRange.filter((b) => b.status !== "cancelled").length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Calendar</h1>
          <p className="text-sm text-slate-600">
            {dayLabel(days[0])} to {dayLabel(days[6])} · {active} call{active === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex gap-1">
          <Link href={`/admin/calendar?week=${offset - 1}`} className="btn-ghost btn-sm" aria-label="Previous week">‹ Prev</Link>
          <Link href="/admin/calendar" className="btn-ghost btn-sm">This week</Link>
          <Link href={`/admin/calendar?week=${offset + 1}`} className="btn-ghost btn-sm" aria-label="Next week">Next ›</Link>
        </div>
      </div>

      {gFlash === "connected" && <p className="rounded-xl bg-brand-50 px-4 py-3 text-sm font-semibold text-brand-800">✓ Google Calendar connected. New bookings will appear on your calendar with a Meet link.</p>}
      {gFlash === "denied" && <p className="error">You cancelled the Google sign-in. Nothing was connected.</p>}
      {gFlash === "failed" && <p className="error">Could not connect Google: {msg || "unknown error"}</p>}
      {gFlash === "missing_keys" && <p className="error">Add GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET to .env.local, restart the server, then click Connect again.</p>}

      {/* integration status */}
      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
        <div className={`rounded-2xl border p-3 text-sm ${g.connected ? "border-brand-200 bg-brand-50" : "border-accent-200 bg-accent-50"}`}>
          <p className="font-semibold">{g.connected ? "✓" : "!"} Google Calendar + Meet</p>
          {g.connected ? (
            <>
              <p className="mt-0.5 text-slate-600">
                Calls go on <b>{g.email || "your calendar"}</b> with a Meet link{g.mode === "service" ? " (Workspace service account)" : ""}.
              </p>
              {g.mode === "oauth" && (
                <div className="mt-2">
                  <DisconnectGoogle />
                </div>
              )}
            </>
          ) : (
            <>
              <p className="mt-0.5 text-slate-600">
                {g.error ? g.error : "Not connected. Calls show only here. Paste Meet links by hand in Calls."}
              </p>
              {g.canConnect ? (
                <a href="/api/admin/google/connect" className="btn-primary btn-sm mt-2">
                  Connect Google Calendar
                </a>
              ) : (
                <p className="mt-2 text-xs text-slate-500">
                  To show the Connect button: add GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET to .env.local (steps in README). Redirect URI: <code className="break-all">{oauthRedirectUri()}</code>
                </p>
              )}
            </>
          )}
        </div>
        {[
          { on: st.zoom, name: "Zoom", on_t: "Zoom links are created automatically for Zoom bookings.", off_t: "Not connected. Paste Zoom links by hand in Calls." },
          { on: st.whatsapp, name: "WhatsApp", on_t: "Link, confirmation, reminders (24 h, 1 h, 10 min) and cancellations go to the student's WhatsApp.", off_t: "Not connected. Use the Send on WhatsApp button in Calls for now." },
          { on: st.sms, name: "SMS (MSG91)", on_t: "OTP, confirmation, reminders and cancellations are sent by SMS.", off_t: "Not connected. OTP shows on screen (dev). Messages are only logged." },
        ].map((x) => (
          <div key={x.name} className={`rounded-2xl border p-3 text-sm ${x.on ? "border-brand-200 bg-brand-50" : "border-accent-200 bg-accent-50"}`}>
            <p className="font-semibold">
              {x.on ? "✓" : "!"} {x.name}: {x.on ? "connected" : "not connected"}
            </p>
            <p className="mt-0.5 text-slate-600">{x.on ? x.on_t : x.off_t}</p>
          </div>
        ))}
      </div>

      {/* agenda: one block per day (works on phone and desktop) */}
      <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
        {days.map((d) => {
          const list = byDay.get(d) || [];
          const isToday = d === dayKey(new Date().toISOString());
          return (
            <section key={d} className={`card p-4 ${isToday ? "ring-2 ring-brand-300" : ""}`}>
              <div className="flex items-center justify-between">
                <p className="font-bold">{dayLabel(d)}</p>
                {isToday && <span className="pill bg-brand-600 text-white">Today</span>}
              </div>
              {list.length === 0 ? (
                <p className="mt-2 text-sm text-slate-500">No calls</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {list.map((b) => {
                    const u = users.get(b.userId);
                    const p = u?.profile;
                    return (
                      <li key={b.id} className="flex gap-3 rounded-xl border border-slate-200 p-3">
                        <div className="w-[4.5rem] shrink-0 whitespace-nowrap text-sm font-bold tabular-nums">{time(b.slotStart)}</div>
                        <div className="min-w-0 flex-1 text-sm">
                          <p className="truncate font-semibold">{p?.name || u?.mobile}</p>
                          <p className="truncate text-xs text-slate-500">
                            {p ? `${classLabel(p.cls)} · ${FIELDS[p.field].label.en}` : ""} · +91 {u?.mobile}
                          </p>
                          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                            <span className={`pill ${STATUS_STYLE[b.status]}`}>{b.status}</span>
                            <span className="pill bg-slate-100 text-slate-700">{b.platform === "meet" ? "Meet" : "Zoom"}</span>
                            {b.calendarEventId && <span className="pill bg-brand-100 text-brand-700">On Google Calendar</span>}
                            {b.meetingLink ? (
                              <a href={b.meetingLink} target="_blank" rel="noreferrer" className="pill bg-brand-600 text-white">
                                Join ↗
                              </a>
                            ) : (
                              b.status === "booked" && <span className="pill bg-accent-100 text-accent-800">No link yet</span>
                            )}
                          </div>
                          {b.syncError && <p className="mt-1 text-xs text-rose-700">Sync error: {b.syncError}</p>}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          );
        })}
      </div>
      <p className="text-xs text-slate-500">
        Add links, notes and outcomes in <Link href="/admin/calls" className="font-semibold text-brand-600">Calls</Link>.
      </p>
    </div>
  );
}
