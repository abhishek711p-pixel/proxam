"use client";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Msg, useApi, type Target } from "./PlanEditor";

/** What students can see of the roadmap: this week only, next week too, or everything. */
export function WeekAccess({
  target,
  isBatch,
  status,
  fromBatch,
  nextWeekLabel,
}: {
  target: Target;
  isBatch: boolean;
  status: string; // e.g. "This week only (till Sun 15 Nov)"
  fromBatch?: boolean;
  nextWeekLabel: string;
}) {
  const { call, busy, msg } = useApi(target);
  const [notify, setNotify] = useState(true);
  return (
    <div>
      <h3 className="flex items-center gap-2 font-display text-base font-bold">
        <Eye size={17} /> What {isBatch ? "students" : "the student"} can see
      </h3>
      <p className="mt-1 text-sm">
        Now: <b>{status}</b>
        {fromBatch && <span className="text-slate-500"> (batch setting)</span>}
      </p>
      <p className="mb-2 text-xs text-slate-500">
        Students see past weeks and this week. Plan next week, then show it (for example on Sunday). On Monday it shows by itself anyway.
      </p>
      <div className="flex flex-wrap gap-2">
        <button className="btn-primary btn-sm" disabled={busy} onClick={() => call("release", { mode: "next", notify }, "Next week is now visible.")}>
          <Eye size={15} /> Show next week ({nextWeekLabel})
        </button>
        <button className="btn-ghost btn-sm" disabled={busy} onClick={() => call("release", { mode: "week" }, "Only this week is visible.")}>
          <EyeOff size={15} /> This week only
        </button>
        <button className="btn-ghost btn-sm" disabled={busy} onClick={() => call("release", { mode: "all", notify }, "The whole roadmap is visible.")}>
          Show whole roadmap
        </button>
        {!isBatch && (
          <button className="btn-ghost btn-sm" disabled={busy} onClick={() => call("release", { mode: "batch" }, "Following the batch setting.")}>
            Use batch setting
          </button>
        )}
      </div>
      <label className="mt-2 flex items-center gap-2 text-sm">
        <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} /> Notify when showing more
      </label>
      <div className="mt-1">
        <Msg m={msg} />
      </div>
    </div>
  );
}

type Chap = { id: string; title: string };
export type TestRow = { no: number; title: string; dateLabel?: string; dateKey?: string; chapterIds: string[]; source: "auto" | "batch" | "student" | "set" };

/** Edit which chapters each checkpoint test covers (and its date). */
export function TestSyllabus({ target, isBatch, tests, subjects }: { target: Target; isBatch: boolean; tests: TestRow[]; subjects: { name: string; chapters: Chap[] }[] }) {
  return (
    <div className="grid gap-2">
      {tests.length === 0 && <p className="text-sm text-slate-600">No tests in this plan yet.</p>}
      {tests.map((t) => (
        <TestRowEditor key={`${t.no}-${t.chapterIds.join(",")}-${t.dateKey}`} target={target} isBatch={isBatch} t={t} subjects={subjects} />
      ))}
    </div>
  );
}

const SOURCE: Record<TestRow["source"], string> = { auto: "Automatic", batch: "Set for the whole batch", student: "Set for this student", set: "Set by you" };

function TestRowEditor({ target, isBatch, t, subjects }: { target: Target; isBatch: boolean; t: TestRow; subjects: { name: string; chapters: Chap[] }[] }) {
  const { call, busy, msg } = useApi(target);
  const [picked, setPicked] = useState<Set<string>>(new Set(t.chapterIds));
  const [date, setDate] = useState(t.source === "auto" ? "" : t.dateKey || "");
  const [notify, setNotify] = useState(true);
  const toggle = (id: string) => setPicked((s) => {
    const n = new Set(s);
    if (n.has(id)) n.delete(id);
    else n.add(id);
    return n;
  });
  const titles = subjects.flatMap((s) => s.chapters).filter((c) => picked.has(c.id)).map((c) => c.title);
  return (
    <details className="rounded-lg border border-slate-200 bg-white">
      <summary className="flex cursor-pointer flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2.5">
        <b>{t.title}</b>
        {t.dateLabel && <span className="text-sm text-slate-600">{t.dateLabel}</span>}
        <span className="text-sm text-slate-600">
          {t.chapterIds.length} chapter{t.chapterIds.length === 1 ? "" : "s"}
        </span>
        <span className={`pill ml-auto ${t.source === "auto" ? "bg-slate-100 text-slate-600" : "bg-accent-100 text-accent-800"}`}>{SOURCE[t.source]}</span>
      </summary>
      <div className="grid gap-3 border-t border-slate-200 p-3">
        <p className="text-xs text-slate-500">
          Tick the chapters this test covers. Questions are picked from these chapters first. {isBatch ? "Applies to every student of the batch (a student's own setting wins)." : "Applies to this student only."}
        </p>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {subjects.map((s) => (
            <div key={s.name}>
              <p className="mb-1 text-sm font-bold">{s.name}</p>
              <ul className="grid gap-1">
                {s.chapters.map((c) => (
                  <li key={c.id}>
                    <label className="flex items-start gap-2 text-sm">
                      <input type="checkbox" className="mt-1" checked={picked.has(c.id)} onChange={() => toggle(c.id)} />
                      <span>{c.title}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-end gap-3 border-t border-slate-200 pt-3">
          <label>
            <span className="label">Test date (optional)</span>
            <input type="date" className="input h-10" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          <label className="flex items-center gap-2 pb-2 text-sm">
            <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} /> Notify
          </label>
          <button className="btn-primary btn-sm" disabled={busy || picked.size === 0} onClick={() => call("checkpoint", { no: t.no, chapters: [...picked], date, notify }, `Saved: ${picked.size} chapters.`)}>
            Save syllabus ({picked.size})
          </button>
          {t.source !== "auto" && (
            <button className="btn-ghost btn-sm" disabled={busy} onClick={() => call("checkpoint", { no: t.no, reset: true }, isBatch ? "Back to automatic." : "Back to the batch / automatic syllabus.")}>
              {isBatch ? "Back to automatic" : "Use batch / automatic"}
            </button>
          )}
          <Msg m={msg} />
        </div>
        {titles.length > 0 && <p className="text-xs text-slate-500">In this test: {titles.join(", ")}</p>}
      </div>
    </details>
  );
}
