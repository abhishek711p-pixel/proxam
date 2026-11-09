import Link from "next/link";
import { doubtPage, studentBrief } from "@/lib/adminData";
import Pager from "@/components/admin/Pager";
import { CLASSES, FIELDS, classLabel, type ClassLevel } from "@/lib/config";
import { SUBJECT_NAME, type SubjectKey } from "@/lib/syllabus";
import Select from "@/components/Select";
import ReplyForm from "./ReplyForm";

const when = (iso: string) => new Date(iso).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
const STATUS: Record<string, string> = { open: "Waiting for a reply", answered: "Answered", resolved: "Student says it is clear" };

type SP = { show?: string; cls?: string; field?: string; subject?: string; q?: string; student?: string; page?: string };

export default async function AdminDoubts({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const show = sp.show || "open";
  const q = (sp.q || "").trim();
  const d = await doubtPage({ ...sp, show, q });
  const count = (s: string) => d.counts[s as keyof typeof d.counts] ?? 0;
  const list = d.list;
  const subjects = d.subjects;
  const keep = (extra: Partial<SP>) => {
    const o = { ...sp, page: undefined, ...extra };
    return `/admin/doubts?${new URLSearchParams(Object.entries(o).filter(([, v]) => v) as [string, string][])}`;
  };
  const filtered = Boolean(sp.cls || sp.field || sp.subject || q || sp.student);
  const who = sp.student ? await studentBrief(sp.student) : undefined;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl">Doubts</h1>
        <p className="text-sm text-slate-600">Questions from batch students. Waiting ones show oldest first. Students see your reply on their dashboard.</p>
      </div>

      <form className="card grid gap-3 p-4 md:grid-cols-5">
        <input type="hidden" name="show" value={show} />
        {sp.student && <input type="hidden" name="student" value={sp.student} />}
        <input name="q" defaultValue={sp.q} placeholder="Name, mobile or words in the doubt" className="input md:col-span-2" />
        <Select name="cls" ariaLabel="Class" defaultValue={sp.cls || ""} options={[{ value: "", label: "All classes" }, ...CLASSES.map((c) => ({ value: c, label: classLabel(c) }))]} />
        <Select name="field" ariaLabel="Stream" defaultValue={sp.field || ""} options={[{ value: "", label: "All streams" }, ...Object.values(FIELDS).map((f) => ({ value: f.id, label: f.label.en }))]} />
        <Select name="subject" ariaLabel="Subject" defaultValue={sp.subject || ""} options={[{ value: "", label: "All subjects" }, ...subjects.map((s) => ({ value: s, label: SUBJECT_NAME[s as SubjectKey]?.en || s }))]} />
        <div className="flex flex-wrap items-center gap-2 md:col-span-5">
          <button className="btn-primary btn-sm">Apply filters</button>
          {filtered && (
            <Link href={`/admin/doubts?show=${show}`} className="btn-ghost btn-sm">
              Clear filters
            </Link>
          )}
          {who && <span className="text-sm text-slate-600">Showing only {who.name || who.mobile}</span>}
        </div>
      </form>

      <div className="flex flex-wrap gap-2">
        {[
          ["open", "Waiting"],
          ["answered", "Answered"],
          ["resolved", "Clear"],
          ["all", "All"],
        ].map(([v, l]) => (
          <Link key={v} href={keep({ show: v })} className={`btn-sm btn ${show === v ? "bg-brand-800 text-white" : "btn-ghost"}`}>
            {l} ({count(v)})
          </Link>
        ))}
      </div>

      {list.length === 0 && <p className="card text-slate-600">{show === "open" && !filtered ? "Nothing waiting. All doubts have a reply." : "No doubts match."}</p>}
      {list.map(({ doubt: d, name, mobile, profile: p }) => {
        const u = { id: d.userId, mobile };
        return (
          <section key={d.id} className="card">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-brand-700">
                  {SUBJECT_NAME[d.subject as SubjectKey]?.en || d.subject}
                  {d.topic ? `, ${d.topic}` : ""}
                </p>
                <p className="text-sm text-slate-600">
                  {u ? (
                    <Link href={`/admin/students/${u.id}`} className="font-semibold text-slate-800 underline decoration-slate-300 underline-offset-4">
                      {name}
                    </Link>
                  ) : (
                    "Deleted student"
                  )}
                  {u && `, ${u.mobile}`}
                  {p && `, ${classLabel(p.cls as ClassLevel)}, ${FIELDS[p.field]?.label.en}`}
                </p>
              </div>
              <span className={`pill ${d.status === "open" ? "bg-accent-100 text-accent-800" : "bg-brand-100 text-brand-800"}`}>{STATUS[d.status]}</span>
            </div>
            <ol className="mt-3 space-y-2">
              {d.messages.map((m, i) => (
                <li key={i} className={`rounded-lg p-3 text-sm ${m.from === "student" ? "bg-slate-100" : "border border-brand-200 bg-brand-50"}`}>
                  <p className="mb-1 text-xs font-semibold text-slate-500">
                    {m.from === "student" ? "Student" : m.by || "Mentor"}, {when(m.at)}
                  </p>
                  <p className="whitespace-pre-wrap">{m.text}</p>
                </li>
              ))}
            </ol>
            {d.status !== "resolved" && <ReplyForm id={d.id} />}
          </section>
        );
      })}
      <Pager base="/admin/doubts" params={{ ...sp, page: undefined }} page={d.page} hasNext={d.hasNext} />
    </div>
  );
}
