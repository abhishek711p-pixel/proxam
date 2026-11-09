import Link from "next/link";
import { batchGroups, batchStudentsTop } from "@/lib/adminData";
import { CLASSES, classLabel, type ClassLevel } from "@/lib/config";
import { allBatches, batchLabel, type BatchField } from "@/lib/batches";
import BatchActions from "./BatchActions";

const ago = (iso?: string) => {
  if (!iso) return "Never";
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  return d <= 0 ? "Today" : d === 1 ? "Yesterday" : `${d} days ago`;
};

const SHOW = 25;

export default async function Batches({ searchParams }: { searchParams: Promise<{ cls?: string; sort?: string }> }) {
  const sp = await searchParams;
  const sortBy = sp.sort || "behind";
  const ALL = allBatches().map((b) => `${b.cls}|${b.field}`);
  const order = (c: string, f: string) => ALL.indexOf(`${c}|${f}`);
  const groups = (await batchGroups(sp.cls)).sort((a, b) => order(a.cls, a.field) - order(b.cls, b.field));
  const lists = await Promise.all(groups.map((g) => batchStudentsTop(g.cls, g.field, sortBy, SHOW)));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl">Batches</h1>
          <p className="text-sm text-slate-600">Every enrolled student, grouped by batch (Class 12 Science has four: JEE, NEET, Boards PCM, Boards PCB). Click a name to edit their progress and roadmap.</p>
          <Link href="/admin/batches/plan" className="text-sm font-semibold text-brand-700 underline underline-offset-4">
            Edit the roadmap of any batch
          </Link>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          {[["", "All"], ...CLASSES.map((c) => [c, classLabel(c)])].map(([v, l]) => (
            <Link key={v} href={`/admin/batches?${new URLSearchParams({ ...(v ? { cls: v } : {}), sort: sortBy })}`} className={`btn btn-sm ${(sp.cls || "") === v ? "bg-brand-800 text-white" : "btn-ghost"}`}>
              {l}
            </Link>
          ))}
        </div>
      </div>
      <p className="text-sm">
        Sort students by:{" "}
        {[["behind", "Most behind"], ["progress", "Least progress"], ["name", "Name"]].map(([v, l]) => (
          <Link key={v} href={`/admin/batches?${new URLSearchParams({ ...(sp.cls ? { cls: sp.cls } : {}), sort: v })}`} className={`mr-3 font-semibold underline-offset-4 ${sortBy === v ? "text-brand-800 underline" : "text-slate-500"}`}>
            {l}
          </Link>
        ))}
      </p>

      {groups.length === 0 && <p className="card text-slate-600">No enrolled students{sp.cls ? " in this class" : ""} yet.</p>}

      {groups.map((g, gi) => {
        const list = lists[gi];
        const cls = g.cls as ClassLevel;
        const field = g.field as BatchField;
        const { avg, behind, idle } = g;
        const total = g.n;
        return (
          <section key={`${cls}|${field}`} className="card">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-xl">{batchLabel(cls, field)}</h2>
                <p className="text-sm text-slate-600">
                  {total.toLocaleString("en-IN")} student{total === 1 ? "" : "s"}, average {avg}% done, {behind} behind plan, {idle} not active this week
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link className="btn-primary btn-sm" href={`/admin/batches/plan?cls=${cls}&field=${field}`}>
                  Edit batch roadmap
                </Link>
                <Link className="btn-ghost btn-sm" href={`/admin/notifications?to=batch&cls=${cls}&field=${field}`}>
                  Notify
                </Link>
                <Link className="btn-ghost btn-sm" href={`/admin/doubts?cls=${cls}&field=${field}`}>
                  Doubts
                </Link>
              </div>
            </div>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="text-xs uppercase text-slate-500">
                  <tr>
                    {["Student", "Done", "Behind", "Last active", "Open doubts"].map((h) => (
                      <th key={h} className="py-2 pr-3 font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {list.map((r) => (
                    <tr key={r.id}>
                      <td className="py-2 pr-3">
                        <Link href={`/admin/students/${r.id}`} className="font-semibold text-brand-800 underline decoration-brand-300 underline-offset-4">
                          {r.name}
                        </Link>
                        <br />
                        <span className="text-xs text-slate-500">{r.mobile}</span>
                      </td>
                      <td className="py-2 pr-3">
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-20 overflow-hidden rounded bg-slate-200">
                            <span className="block h-full bg-brand-600" style={{ width: `${r.pct}%` }} />
                          </span>
                          <b>{r.pct}%</b>
                        </div>
                      </td>
                      <td className={`py-2 pr-3 ${r.behind ? "font-semibold text-accent-700" : "text-slate-500"}`}>{r.behind ? `${r.behind} steps` : "On track"}</td>
                      <td className="py-2 pr-3">{ago(r.lastActive)}</td>
                      <td className="py-2 pr-3">{r.openDoubts || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {total > list.length && (
              <Link href={`/admin/students?batch=paid&cls=${cls}&field=${field}&sort=${sortBy === "progress" ? "progress" : sortBy === "name" ? "name" : "behind"}`} className="mt-2 inline-block text-sm font-semibold text-brand-700 underline underline-offset-4">
                See all {total.toLocaleString("en-IN")} students of this batch
              </Link>
            )}
            <BatchActions cls={cls} field={field} count={total} />
          </section>
        );
      })}
    </div>
  );
}
