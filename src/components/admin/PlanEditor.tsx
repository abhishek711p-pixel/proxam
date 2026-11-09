"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Pencil, Plus, Trash2, Video } from "lucide-react";
import Select from "@/components/Select";
import type { MentorTask, TaskKind } from "@/lib/types";

export type PItem = {
  id: string;
  kind: string;
  subject: string;
  title: string;
  dateKey: string;
  minutes: number;
  done?: boolean;
  overdue?: boolean;
  chapterId?: string;
  moved?: boolean;
  material?: { videos: number; dpp: number; notes: number };
  mentor?: { taskId: string; timeLabel?: string; link?: string; forBatch: boolean };
};
export type PWeek = { key: string; label: string; visible?: boolean; goal?: string; batchGoal?: string; days: { key: string; label: string; items: PItem[] }[] };
export type Target = { userId: string } | { cls: string; field: string };
type Opt = { value: string; label: string };

const KINDS: [TaskKind, string][] = [
  ["topic", "Topic"],
  ["questions", "Questions"],
  ["revision", "Revision"],
  ["meet", "Meeting"],
  ["other", "Other"],
];
const KIND_NAME: Record<string, string> = { learn: "Learn", practice: "Practice", topic: "Topic", questions: "Questions", revision: "Revision", meet: "Meeting", other: "Task" };

export function useApi(target: Target) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  async function call(action: string, extra: Record<string, unknown> = {}, okText = "Saved.", confirmText?: string) {
    if (confirmText && !confirm(confirmText)) return false;
    setBusy(true);
    setMsg(null);
    const r = await fetch("/api/admin/plan", { method: "POST", body: JSON.stringify({ ...target, action, ...extra }) })
      .then((r) => r.json())
      .catch(() => null);
    setBusy(false);
    setMsg(r?.ok ? { ok: true, t: okText } : { ok: false, t: r?.error || "Could not save." });
    if (r?.ok) router.refresh();
    return Boolean(r?.ok);
  }
  return { call, busy, msg };
}

export function Msg({ m }: { m: { ok: boolean; t: string } | null }) {
  if (!m) return null;
  return <span className={`text-sm font-semibold ${m.ok ? "text-brand-700" : "text-accent-700"}`}>{m.t}</span>;
}

/* ---------------------------------------------------------------- add / edit an item */

function TaskForm({ target, subjects, edit, initialKind, defaultDate, onDone, isBatch }: { target: Target; subjects: Opt[]; edit?: MentorTask; initialKind?: TaskKind; defaultDate: string; onDone: () => void; isBatch: boolean }) {
  const { call, busy, msg } = useApi(target);
  const [kind, setKind] = useState<TaskKind>(edit?.kind || initialKind || "topic");
  const [title, setTitle] = useState(edit?.title || "");
  const [subject, setSubject] = useState(edit?.subject || "");
  const [date, setDate] = useState(edit?.date || defaultDate);
  const [time, setTime] = useState(edit?.time || "18:00");
  const [minutes, setMinutes] = useState(String(edit?.minutes || (initialKind === "meet" ? 45 : 30)));
  const [note, setNote] = useState(edit?.note || "");
  const [link, setLink] = useState(edit?.link || "");
  const [autoMeet, setAutoMeet] = useState(false);
  const [notify, setNotify] = useState(true);
  const [qs, setQs] = useState<{ q: string; a: string }[]>(edit?.questions?.map((x) => ({ q: x.q, a: x.a || "" })) || [{ q: "", a: "" }]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const ok = await call(
      edit ? "updateTask" : "addTask",
      { id: edit?.id, kind, title, subject, date, time, minutes: Number(minutes), note, link, autoMeet: kind === "meet" && autoMeet, notify, questions: qs },
      edit ? "Updated." : "Added to the roadmap.",
    );
    if (ok) onDone();
  }

  return (
    <form onSubmit={save} className="grid gap-3 rounded-lg border border-brand-200 bg-brand-50/50 p-4">
      <div className="flex flex-wrap gap-2">
        {KINDS.map(([k, l]) => (
          <button
            type="button"
            key={k}
            onClick={() => {
              setKind(k);
              if (k === "meet" && minutes === "30") setMinutes("45");
            }}
            className={`btn btn-sm ${kind === k ? "bg-brand-800 text-white" : "btn-ghost bg-white"}`}
          >
            {l}
          </button>
        ))}
      </div>
      <div className="grid gap-3 md:grid-cols-[2fr_1fr]">
        <label>
          <span className="label">{kind === "meet" ? "Meeting title" : kind === "questions" ? "Name of the set" : "Title"}</span>
          <input className="input" maxLength={140} value={title} onChange={(e) => setTitle(e.target.value)} placeholder={kind === "meet" ? "e.g. One to one: progress review" : kind === "questions" ? "e.g. Laws of motion, 10 questions" : "e.g. Revise electrostatics formulas"} />
        </label>
        <div>
          <span className="label">Subject (optional)</span>
          <Select ariaLabel="Subject" value={subject} onChange={setSubject} options={[{ value: "", label: "No subject" }, ...subjects]} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <label>
          <span className="label">Date</span>
          <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        {kind === "meet" && (
          <label>
            <span className="label">Time (IST)</span>
            <input className="input" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </label>
        )}
        <label>
          <span className="label">Minutes</span>
          <input className="input" type="number" min={5} max={600} value={minutes} onChange={(e) => setMinutes(e.target.value)} />
        </label>
      </div>
      <label>
        <span className="label">Note for the {isBatch ? "students" : "student"} (optional)</span>
        <textarea className="input min-h-20 py-3" value={note} onChange={(e) => setNote(e.target.value)} placeholder="What to do, which pages, what to bring to the meeting" />
      </label>
      <label>
        <span className="label">{kind === "meet" ? "Meeting link" : "Link (optional): video, PDF, notes"}</span>
        <input className="input" value={link} onChange={(e) => setLink(e.target.value)} placeholder={kind === "meet" ? "https://meet.google.com/..." : "https://..."} />
      </label>
      {kind === "meet" && !link && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={autoMeet} onChange={(e) => setAutoMeet(e.target.checked)} /> Make a Google Meet link for me (needs Google Calendar connected)
        </label>
      )}

      {kind === "questions" && (
        <div className="grid gap-2">
          <span className="label">Questions</span>
          {qs.map((r, i) => (
            <div key={i} className="grid gap-2 rounded-lg border border-slate-200 bg-white p-3 md:grid-cols-[1fr_1fr_auto]">
              <textarea className="input min-h-16 py-2" placeholder={`Question ${i + 1}`} value={r.q} onChange={(e) => setQs(qs.map((x, j) => (j === i ? { ...x, q: e.target.value } : x)))} />
              <textarea className="input min-h-16 py-2" placeholder="Answer or hint (shown when the student taps Show answer)" value={r.a} onChange={(e) => setQs(qs.map((x, j) => (j === i ? { ...x, a: e.target.value } : x)))} />
              <button type="button" className="btn-ghost btn-sm self-start text-accent-700" aria-label="Remove question" onClick={() => setQs(qs.length > 1 ? qs.filter((_, j) => j !== i) : [{ q: "", a: "" }])}>
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          <button type="button" className="btn-ghost btn-sm justify-self-start bg-white" onClick={() => setQs([...qs, { q: "", a: "" }])}>
            <Plus size={16} /> Add a question
          </button>
        </div>
      )}

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} /> Send a notification to the {isBatch ? "batch" : "student"}
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <button className="btn-primary btn-sm" disabled={busy}>
          {busy ? "Saving..." : edit ? "Save changes" : kind === "meet" ? "Schedule meeting" : "Add to roadmap"}
        </button>
        <button type="button" className="btn-ghost btn-sm bg-white" onClick={onDone}>
          Cancel
        </button>
        <Msg m={msg} />
      </div>
    </form>
  );
}

/* ---------------------------------------------------------------- roadmap settings */

export function PlanSettings({
  target,
  isBatch,
  start,
  endDate,
  defaultEndLabel,
  order,
  subjects,
  skipped,
  chapterOpts,
  batchCount,
}: {
  target: Target;
  isBatch: boolean;
  start?: string;
  endDate?: string;
  defaultEndLabel: string;
  order: string[];
  subjects: Opt[];
  skipped: { id: string; title: string; fromBatch?: boolean }[];
  chapterOpts: Opt[];
  batchCount?: number;
}) {
  const { call, busy, msg } = useApi(target);
  const [newStart, setNewStart] = useState(start || "");
  const [end, setEnd] = useState(endDate || "");
  const [notify, setNotify] = useState(true);
  const [ord, setOrd] = useState(order.length ? order : subjects.map((s) => s.value));
  const [take, setTake] = useState("");
  const nameOf = (k: string) => subjects.find((s) => s.value === k)?.label || k;
  const move = (i: number, d: number) => {
    const n = [...ord];
    [n[i], n[i + d]] = [n[i + d], n[i]];
    setOrd(n);
  };
  const who = isBatch ? `all ${batchCount ?? ""} students in this batch` : "this student";

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <div>
        <h3 className="font-display text-base font-bold">New roadmap</h3>
        <p className="mb-2 text-xs text-slate-500">Rebuilds the plan for {who} from a start date. Ticked chapters stay ticked. Hand-moved dates are cleared.</p>
        <div className="grid grid-cols-2 gap-2">
          <label>
            <span className="label">Start</span>
            <input className="input" type="date" value={newStart} onChange={(e) => setNewStart(e.target.value)} />
          </label>
          <label>
            <span className="label">Finish syllabus by</span>
            <input className="input" type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
          </label>
        </div>
        <p className="mt-1 text-xs text-slate-500">Leave the finish date empty for the default: {defaultEndLabel}.</p>
        <label className="mt-2 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} /> Notify
        </label>
        <div className="mt-2 flex flex-wrap gap-2">
          <button className="btn-primary btn-sm" disabled={busy || !newStart} onClick={() => call("fresh", { start: newStart, end, notify }, "New roadmap made.", `Make a new roadmap for ${who}, starting ${newStart}?`)}>
            Make new roadmap
          </button>
          <button className="btn-ghost btn-sm" disabled={busy} onClick={() => call("endDate", { date: end }, end ? "Finish date saved." : "Back to the default finish date.")}>
            Only change finish date
          </button>
        </div>
      </div>

      <div>
        <h3 className="font-display text-base font-bold">Subject order</h3>
        <p className="mb-2 text-xs text-slate-500">The first subject gets its chapters earliest. {order.length ? "" : "Now automatic: weak subjects from the test come first."}</p>
        <ol className="grid gap-1">
          {ord.map((k, i) => (
            <li key={k} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-sm">
              <span className="w-4 text-slate-400">{i + 1}</span>
              <span className="flex-1 font-semibold">{nameOf(k)}</span>
              <button className="rounded p-1 hover:bg-slate-100 disabled:opacity-30" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)}>
                <ArrowUp size={15} />
              </button>
              <button className="rounded p-1 hover:bg-slate-100 disabled:opacity-30" aria-label="Move down" disabled={i === ord.length - 1} onClick={() => move(i, 1)}>
                <ArrowDown size={15} />
              </button>
            </li>
          ))}
        </ol>
        <div className="mt-2 flex flex-wrap gap-2">
          <button className="btn-ghost btn-sm" disabled={busy} onClick={() => call("order", { order: ord }, "Order saved.")}>
            Save order
          </button>
          {order.length > 0 && (
            <button className="btn-ghost btn-sm" disabled={busy} onClick={() => call("order", { order: [] }, "Back to automatic.")}>
              Automatic
            </button>
          )}
        </div>
      </div>

      <div>
        <h3 className="font-display text-base font-bold">Chapters taken out</h3>
        <p className="mb-2 text-xs text-slate-500">Not in the syllabus, already finished in school, or not needed. The rest of the plan spreads out to fill the time.</p>
        {skipped.length === 0 && <p className="text-sm text-slate-500">None.</p>}
        <ul className="grid gap-1">
          {skipped.map((c) => (
            <li key={c.id} className="flex items-center gap-2 text-sm">
              <span className="flex-1">{c.title}</span>
              {c.fromBatch ? (
                <span className="text-xs text-slate-500">for whole batch</span>
              ) : (
                <button className="text-xs font-semibold text-brand-700 underline" disabled={busy} onClick={() => call("skip", { chapterId: c.id, on: false }, "Chapter is back.")}>
                  Put back
                </button>
              )}
            </li>
          ))}
        </ul>
        <div className="mt-2 grid gap-2">
          <Select ariaLabel="Chapter to take out" value={take} onChange={setTake} options={chapterOpts} placeholder="Pick a chapter to take out" />
          <button className="btn-ghost btn-sm justify-self-start" disabled={busy || !take} onClick={() => call("skip", { chapterId: take, on: true }, "Chapter taken out.").then(() => setTake(""))}>
            Take out
          </button>
        </div>
      </div>
      <div className="lg:col-span-3">
        <Msg m={msg} />
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- week by week */

export function PlanWeeks({
  target,
  isBatch,
  weeks,
  initialWeek,
  tasks,
  subjects,
  today,
}: {
  target: Target;
  isBatch: boolean;
  weeks: PWeek[];
  initialWeek: number;
  tasks: MentorTask[];
  subjects: Opt[];
  today: string;
}) {
  const router = useRouter();
  const { call, busy, msg } = useApi(target);
  const [w, setW] = useState(Math.min(initialWeek, Math.max(0, weeks.length - 1)));
  const [form, setForm] = useState<{ edit?: MentorTask; kind?: TaskKind; date: string } | null>(null);
  const week = weeks[w];
  const [goal, setGoal] = useState(week?.goal || "");
  const [goalFor, setGoalFor] = useState(week?.key);
  const [notifyGoal, setNotifyGoal] = useState(true);
  if (week && goalFor !== week.key) {
    setGoalFor(week.key);
    setGoal(week.goal || "");
  }
  const taskById = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks]);
  const firstDay = week ? (week.key < today && today < addDays(week.key, 7) ? today : week.key) : today;

  async function tick(stepId: string, done: boolean) {
    if (!("userId" in target)) return;
    await fetch(`/api/admin/students/${target.userId}`, { method: "POST", body: JSON.stringify({ action: "step", id: stepId, done }) });
    router.refresh();
  }

  if (!week) return <p className="text-sm text-slate-600">No weeks in this plan yet.</p>;
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <button className="btn-ghost btn-sm" aria-label="Previous week" disabled={w === 0} onClick={() => setW(w - 1)}>
          <ChevronLeft size={16} />
        </button>
        <b className="min-w-44 text-center">
          Week {w + 1}: {week.label}
        </b>
        {week.visible === false ? (
          <span className="flex items-center gap-2">
            <span className="pill bg-slate-200 text-slate-700">Hidden from {isBatch ? "students" : "student"}</span>
            <button className="text-xs font-semibold text-brand-700 underline" disabled={busy} onClick={() => call("release", { mode: "upto", week: week.key, notify: true }, "Visible now.")}>
              Show up to this week
            </button>
          </span>
        ) : (
          week.visible && <span className="pill bg-brand-100 text-brand-800">Visible</span>
        )}
        <button className="btn-ghost btn-sm" aria-label="Next week" disabled={w >= weeks.length - 1} onClick={() => setW(w + 1)}>
          <ChevronRight size={16} />
        </button>
        <button className="btn-primary btn-sm ml-auto" onClick={() => setForm({ date: firstDay })}>
          <Plus size={16} /> Add to this week
        </button>
        <button className="btn-ghost btn-sm" onClick={() => setForm({ date: firstDay, kind: "meet" })}>
          <Video size={16} /> Schedule a meeting
        </button>
      </div>

      {form && (
        <TaskForm
          key={`${form.edit?.id || "new"}-${form.kind || ""}-${form.date}`}
          target={target}
          isBatch={isBatch}
          subjects={subjects}
          edit={form.edit}
          initialKind={form.kind}
          defaultDate={form.date}
          onDone={() => setForm(null)}
        />
      )}

      <div className="rounded-lg border border-slate-200 p-3">
        <label className="label" htmlFor={`goal-${week.key}`}>
          Goal for this week
        </label>
        {week.batchGoal && !isBatch && <p className="mb-1 text-xs text-slate-500">Batch goal: {week.batchGoal}. Writing one here replaces it for this student.</p>}
        <textarea id={`goal-${week.key}`} className="input min-h-16 py-2" value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="e.g. Finish Laws of Motion and solve 30 numericals before Saturday's checkpoint" />
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <button className="btn-ghost btn-sm" disabled={busy} onClick={() => call("weekGoal", { week: week.key, text: goal, notify: notifyGoal }, goal ? "Goal saved." : "Goal removed.")}>
            Save goal
          </button>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={notifyGoal} onChange={(e) => setNotifyGoal(e.target.checked)} /> Notify
          </label>
          <Msg m={msg} />
        </div>
      </div>

      {week.days.length === 0 && <p className="text-sm text-slate-500">Nothing planned this week{isBatch ? " by you for the batch. Each student's chapters follow their own start date." : "."}</p>}
      {week.days.map((day) => (
        <div key={day.key}>
          <h4 className="mb-1 text-sm font-bold text-slate-700">{day.label}</h4>
          <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
            {day.items.map((x) => {
              const t = x.mentor ? taskById.get(x.mentor.taskId) : undefined;
              return (
                <li key={x.id} className={`flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2 text-sm ${x.mentor ? "bg-accent-50/50" : ""}`}>
                  {!isBatch && x.kind !== "meet" ? (
                    <input type="checkbox" aria-label="Done" checked={Boolean(x.done)} onChange={(e) => tick(x.id, e.target.checked)} />
                  ) : (
                    <span className="w-[13px]" />
                  )}
                  <span className={`pill ${x.mentor ? "bg-accent-100 text-accent-800" : "bg-slate-100"}`}>{KIND_NAME[x.kind] || x.kind}</span>
                  <span className="min-w-0 flex-1">
                    <span className={`font-semibold ${x.done ? "text-slate-400 line-through" : ""}`}>{x.title}</span>
                    <span className="text-slate-500">
                      {x.subject ? `, ${x.subject}` : ""}, {x.minutes} min
                      {x.mentor?.timeLabel ? `, ${x.mentor.timeLabel}` : ""}
                    </span>
                    {x.overdue && !x.done && <span className="ml-2 text-xs font-semibold text-accent-700">overdue</span>}
                    {x.chapterId && (
                      <span className={`ml-2 text-xs ${x.material?.videos ? "text-brand-700" : "text-accent-700"}`}>
                        {x.material?.videos ? `▶ ${x.material.videos} video` : "no video"}
                        {x.material?.dpp ? `, DPP ${x.material.dpp}` : ", no DPP"}
                      </span>
                    )}
                    {x.moved && <span className="ml-2 text-xs text-slate-500">moved by you</span>}
                    {x.mentor?.forBatch && !isBatch && <span className="ml-2 text-xs text-slate-500">from batch plan</span>}
                    {x.mentor?.link && (
                      <a href={x.mentor.link} target="_blank" rel="noreferrer" className="ml-2 text-xs font-semibold text-brand-700 underline">
                        link
                      </a>
                    )}
                  </span>
                  {x.chapterId && !isBatch && (
                    <span className="flex items-center gap-1">
                      <input
                        type="date"
                        aria-label="Move to date"
                        className="input h-8 w-36 py-0 text-xs"
                        defaultValue={x.dateKey}
                        onChange={(e) => e.target.value && call("move", { stepId: x.id, date: e.target.value }, "Moved.")}
                      />
                      {x.moved && (
                        <button className="text-xs font-semibold text-brand-700 underline" onClick={() => call("move", { stepId: x.id, date: "" }, "Back to the planned date.")}>
                          Undo move
                        </button>
                      )}
                      <a className="ml-1 text-xs font-semibold text-brand-700 underline" href={materialHref(x.chapterId)} target="_blank" rel="noreferrer">
                        {x.material ? "Edit video & DPP" : "Add video & DPP"}
                      </a>
                      {x.kind === "learn" && (
                        <button className="ml-1 text-xs font-semibold text-accent-700 underline" onClick={() => call("skip", { chapterId: x.chapterId, on: true }, "Chapter taken out.", `Take "${x.title}" out of the roadmap?`)}>
                          Take out
                        </button>
                      )}
                    </span>
                  )}
                  {t && (isBatch || !x.mentor?.forBatch) && (
                    <span className="flex items-center gap-1">
                      <button className="rounded p-1.5 hover:bg-white" aria-label="Edit" onClick={() => setForm({ edit: t, date: t.date })}>
                        <Pencil size={15} />
                      </button>
                      <button className="rounded p-1.5 text-accent-700 hover:bg-white" aria-label="Delete" onClick={() => call("deleteTask", { id: t.id }, "Removed.", `Remove "${t.title}"?`)}>
                        <Trash2 size={15} />
                      </button>
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

/** Admin page where this chapter's video, notes and DPP are added (opens on that chapter). */
export function materialHref(chapterId: string) {
  const [level, subject] = chapterId.split("-");
  return `/admin/content?cls=${level}&subject=${subject}&open=${chapterId}#${chapterId}`;
}

function addDays(key: string, n: number) {
  const t = Date.parse(`${key}T00:00:00Z`) + n * 86_400_000;
  return new Date(t).toISOString().slice(0, 10);
}
