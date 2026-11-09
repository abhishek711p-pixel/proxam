import Link from "next/link";
import { funnel, upcomingCalls } from "@/lib/adminData";
import { recentResults } from "@/lib/store";
import { FIELDS } from "@/lib/config";
import { finalizeExpired } from "@/lib/testEngine";

export default async function AdminHome() {
  await finalizeExpired();
  const [f, recent, upcoming] = await Promise.all([funnel(), recentResults(10), upcomingCalls(5)]);
  const fmt = (s: string) => new Date(s).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Overview</h1>
      <section className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
        {f.map((x, i) => (
          <div key={x.label} className="card p-4">
            <p className="text-xs text-slate-500">{x.label}</p>
            <p className="mt-1 text-3xl font-extrabold">{x.value.toLocaleString("en-IN")}</p>
            {i > 0 && i < 6 && f[i - 1].value > 0 && <p className="text-xs text-slate-500">{Math.round((x.value / f[i - 1].value) * 100)}% of previous</p>}
            {i === 6 && f[3].value > 0 && <p className="text-xs text-slate-500">{Math.round((x.value / f[3].value) * 100)}% of test takers</p>}
          </div>
        ))}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-bold">Latest results</h2>
            <Link href="/admin/students" className="text-sm font-semibold text-brand-600">All students →</Link>
          </div>
          {recent.length === 0 ? <p className="text-slate-500">No results yet.</p> : (
            <ul className="divide-y divide-slate-100">
              {recent.map(({ attempt: a, name }) => (
                <li key={a.id} className="flex items-start justify-between gap-3 py-2 text-sm">
                  <span className="min-w-0">
                    <b>{name}</b>
                    <span className="block text-xs text-slate-500">{FIELDS[a.field].label.en}</span>
                  </span>
                  <span className="shrink-0 text-right font-semibold">
                    {a.result?.percentage}%<span className="block text-xs font-normal text-slate-500">{a.result?.level}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="card">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-bold">Upcoming calls</h2>
            <Link href="/admin/calls" className="text-sm font-semibold text-brand-600">All calls →</Link>
          </div>
          {upcoming.length === 0 ? <p className="text-slate-500">No upcoming calls.</p> : (
            <ul className="divide-y divide-slate-100">
              {upcoming.map(({ data: b, name }) => (
                <li key={b.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span><b>{name}</b> · {b.platform === "meet" ? "Meet" : "Zoom"}</span>
                  <span>{fmt(b.slotStart)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
