import { allMasterclasses } from "@/lib/store";
import { seatSummary } from "@/lib/adminData";
import { MASTERCLASS_MINUTES, MASTERCLASS_PRICE } from "@/lib/config";
import { googleStatus } from "@/lib/integrations/google";
import { mcAudience, mcIsOver } from "@/lib/masterclass";
import type { Masterclass } from "@/lib/types";
import NewMasterclass from "./NewMasterclass";
import McRowActions from "./McRowActions";

const ist = (iso: string) => new Date(new Date(iso).getTime() + 5.5 * 3600_000).toISOString();
const when = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });

function formValues(m: Masterclass) {
  const x = ist(m.startsAt);
  return { cls: m.cls, field: m.field || "", title: m.title, desc: m.desc, host: m.host || "", date: x.slice(0, 10), time: x.slice(11, 16), minutes: m.minutes, price: m.price, meetingLink: m.meetingLink || "" };
}

export default async function AdminMasterclasses() {
  const [mcs, seatMap] = await Promise.all([allMasterclasses(), seatSummary(100)]);
  const g = await googleStatus();
  const googleOn = Boolean(g.connected);
  const list = [...mcs].sort((a, b) => {
    const ao = mcIsOver(a) ? 1 : 0;
    const bo = mcIsOver(b) ? 1 : 0;
    return ao - bo || (ao ? b.startsAt.localeCompare(a.startsAt) : a.startsAt.localeCompare(b.startsAt));
  });
  const seatsFor = (id: string) => seatMap.get(id) || { n: 0, revenue: 0, list: [] };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl">Masterclasses</h1>
        <p className="text-sm text-slate-600">
          One live class per batch. You set the date and time; students cannot change them. Times are India time. Students see the join link only after they book.
        </p>
      </div>

      <NewMasterclass initial={{ cls: "12", field: "", title: "", desc: "", host: "", date: "", time: "18:00", minutes: MASTERCLASS_MINUTES, price: MASTERCLASS_PRICE, meetingLink: "" }} />

      {list.map((m) => {
        const seats = seatsFor(m.id);
        const over = mcIsOver(m);
        const revenue = seats.revenue;
        return (
          <section key={m.id} className={`card ${over || m.status === "cancelled" ? "opacity-70" : ""}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-brand-700">
                  {mcAudience(m)}
                  {m.status === "cancelled" && <span className="pill bg-accent-100 text-accent-800">Cancelled</span>}
                  {over && m.status !== "cancelled" && <span className="pill bg-slate-200 text-slate-700">Finished</span>}
                </p>
                <h2 className="text-lg">{m.title}</h2>
                <p className="text-sm text-slate-600">
                  {when(m.startsAt)}, {m.minutes} min, ₹{m.price}
                  {m.host ? `, ${m.host}` : ""}
                </p>
                <p className="mt-1 text-sm">
                  {m.meetingLink ? (
                    <a href={m.meetingLink} target="_blank" rel="noreferrer" className="text-brand-700 underline underline-offset-2">
                      {m.meetingLink}
                    </a>
                  ) : (
                    <span className="text-accent-700">No join link yet</span>
                  )}
                </p>
              </div>
              <div className="text-right">
                <p className="font-display text-2xl font-bold text-brand-900">{seats.n.toLocaleString("en-IN")}</p>
                <p className="text-xs text-slate-500">seats, ₹{revenue}</p>
              </div>
            </div>

            <div className="mt-3">
              <McRowActions id={m.id} status={m.status} hasLink={Boolean(m.meetingLink)} googleOn={googleOn} initial={formValues(m)} />
            </div>

            {seats.n > 0 && (
              <details className="mt-3 border-t border-slate-200 pt-3">
                <summary className="cursor-pointer text-sm font-semibold">
                  Students who booked ({seats.n.toLocaleString("en-IN")}){seats.n > seats.list.length ? `, first ${seats.list.length} shown` : ""}
                </summary>
                <ul className="mt-2 divide-y divide-slate-200 text-sm">
                  {seats.list.map((s) => (
                    <li key={s.id} className="flex flex-wrap justify-between gap-2 py-2">
                      <span>
                        <b>{s.name}</b>, {s.mobile}
                      </span>
                      <span className="text-slate-500">
                        ₹{s.amount} {s.mode === "demo" ? "(demo)" : ""}, {when(s.paidAt)}
                      </span>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </section>
        );
      })}
    </div>
  );
}
