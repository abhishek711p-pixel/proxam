import { TRACKS, TRACK_IDS } from "@/lib/batches";
import Link from "next/link";
import { BANDS, studentCount, studentPage, type Filters } from "@/lib/adminData";
import Pager from "@/components/admin/Pager";
import { CLASSES, FIELDS, classLabel, type ClassLevel } from "@/lib/config";
import Select from "@/components/Select";
import { finalizeExpired } from "@/lib/testEngine";
import DeleteStudentButton from "@/components/admin/DeleteStudentButton";

export default async function Students({ searchParams }: { searchParams: Promise<Filters> }) {
  await finalizeExpired();
  const sp = await searchParams;
  const [{ rows, page, hasNext }, total] = await Promise.all([studentPage(sp), studentCount(sp)]);
  const { page: _p, ...filters } = sp;
  void _p;
  const qs = new URLSearchParams(Object.entries(filters).filter(([, v]) => v) as [string, string][]).toString();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Students &amp; leads <span className="text-slate-400">({total.toLocaleString("en-IN")})</span></h1>
        <a href={`/api/admin/export${qs ? `?${qs}` : ""}`} className="btn-primary btn-sm">⬇ Export CSV</a>
      </div>

      <form className="card grid gap-3 p-4 md:grid-cols-3 lg:grid-cols-6">
        <input name="q" defaultValue={sp.q} placeholder="Name, mobile, school" className="input lg:col-span-2" />
        <Select name="cls" ariaLabel="Class" defaultValue={sp.cls || ""} options={[{ value: "", label: "All classes" }, ...CLASSES.map((c) => ({ value: c, label: classLabel(c) }))]} />
        <Select name="field" ariaLabel="Field" defaultValue={sp.field || ""} options={[{ value: "", label: "All fields" }, ...Object.values(FIELDS).map((f) => ({ value: f.id, label: f.label.en })), ...TRACK_IDS.map((t) => ({ value: t, label: `Batch: ${TRACKS[t].label.en}` }))]} />
        <Select name="band" ariaLabel="Score band" defaultValue={sp.band || ""} options={[{ value: "", label: "All score bands" }, ...BANDS.map((b) => ({ value: b.v, label: b.l }))]} />
        <Select name="call" ariaLabel="Call status" defaultValue={sp.call || ""} options={[{ value: "", label: "Any call status" }, ...["none", "booked", "attended", "no_show"].map((c) => ({ value: c, label: c }))]} />
        <Select name="batch" ariaLabel="Batch" defaultValue={sp.batch || ""} options={[{ value: "", label: "Batch: all" }, { value: "paid", label: "Joined batch" }, { value: "behind", label: "In batch, behind plan" }, { value: "none", label: "Not joined" }]} />
        <input name="city" defaultValue={sp.city} placeholder="City" className="input" />
        <Select name="sort" ariaLabel="Sort" defaultValue={sp.sort || "new"} options={[{ value: "new", label: "Newest first" }, { value: "behind", label: "Most behind" }, { value: "progress", label: "Least progress" }, { value: "active", label: "Recently active" }, { value: "name", label: "Name A to Z" }]} />
        <div className="flex gap-2 md:col-span-3 lg:col-span-3">
          <button className="btn-primary btn-sm">Apply filters</button>
          <a href="/admin/students" className="btn-ghost btn-sm">Reset</a>
        </div>
      </form>

      <Pager base="/admin/students" params={filters} page={page} hasNext={hasNext} total={total} />
      <div className="card overflow-x-auto p-0">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              {["Student", "Mobile · Email", "Class · Field", "City · Board", "Goal", "Tests", "Latest", "Weak subjects", "Call", "Batch", "Progress", "Action"].map((h) => (
                <th key={h} className="px-4 py-3 font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 && (
              <tr><td colSpan={12} className="px-4 py-8 text-center text-slate-500">No students match.</td></tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="align-top">
                <td className="px-4 py-3"><Link href={`/admin/students/${r.id}`} className="font-bold text-brand-800 underline decoration-brand-300 underline-offset-4 hover:decoration-brand-700">{r.name}</Link><br /><span className="text-xs text-slate-500">{r.school}</span></td>
                <td className="px-4 py-3">{r.mobile || "—"}<br /><span className="break-all text-xs text-slate-500">{r.email}</span></td>
                <td className="px-4 py-3">{classLabel(r.cls as ClassLevel)} · {r.fieldLabel}</td>
                <td className="px-4 py-3">{r.city}<br /><span className="text-xs text-slate-500">{r.board}</span></td>
                <td className="px-4 py-3">{r.goal}</td>
                <td className="px-4 py-3">{r.attempts}{r.paidTests > 0 && <><br /><span className="text-xs text-accent-700">{r.paidTests} paid, ₹{r.paidTestAmount}</span></>}</td>
                <td className="px-4 py-3">{r.latest ? <><b>{r.latest.percentage}%</b><br /><span className="text-xs text-slate-500">{r.latest.level}</span></> : "—"}</td>
                <td className="px-4 py-3 text-xs">{r.latest?.weak.join(", ") || "—"}</td>
                <td className="px-4 py-3"><span className="pill bg-slate-100">{r.callStatus}</span></td>
                <td className="px-4 py-3">{r.batch === "none" ? "—" : <><span className="text-xs font-semibold text-brand-900">{r.batchName}</span><br /><span className="pill bg-brand-100 text-brand-700">₹{r.batchAmount} {r.batch === "demo" ? "(demo)" : r.batch === "admin" ? "(admin)" : "paid"}</span></>}</td>
                <td className="px-4 py-3">{r.progress === undefined ? "—" : <><b>{r.progress}%</b>{r.behind ? <><br /><span className="text-xs text-accent-700">{r.behind} steps behind</span></> : <><br /><span className="text-xs text-slate-500">on track</span></>}</>}</td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <DeleteStudentButton id={r.id} name={r.name || r.mobile || "this student"} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pager base="/admin/students" params={filters} page={page} hasNext={hasNext} total={total} />
    </div>
  );
}
