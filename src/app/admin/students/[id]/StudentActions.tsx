"use client";
import { materialHref } from "@/components/admin/PlanEditor";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Select from "@/components/Select";

export function useAct(id: string) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  async function act(action: string, extra: Record<string, unknown> = {}, confirmText?: string) {
    if (confirmText && !confirm(confirmText)) return false;
    setBusy(true);
    setMsg("");
    const r = await fetch(`/api/admin/students/${id}`, { method: "POST", body: JSON.stringify({ action, ...extra }) })
      .then((r) => r.json())
      .catch(() => null);
    setBusy(false);
    if (!r?.ok) {
      setMsg(r?.error || "Something went wrong.");
      return false;
    }
    router.refresh();
    return true;
  }
  return { act, busy, msg, setMsg };
}

type Opt = { value: string; label: string };

export function ProfileForm({ id, initial, classOpts, fieldOpts, boardOpts }: { id: string; initial: Record<string, string>; classOpts: Opt[]; fieldOpts: (Opt & { classes: string[] })[]; boardOpts: Opt[] }) {
  const { act, busy, msg } = useAct(id);
  const [v, setV] = useState(initial);
  const [saved, setSaved] = useState(false);
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setV({ ...v, [k]: e.target.value });
  const fields = fieldOpts.filter((f) => f.classes.includes(v.cls));
  return (
    <form
      className="grid gap-3 md:grid-cols-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setSaved(false);
        if (await act("profile", v)) setSaved(true);
      }}
    >
      <label>
        <span className="label">Name</span>
        <input className="input" value={v.name} onChange={set("name")} />
      </label>
      <div>
        <span className="label">Class</span>
        <Select ariaLabel="Class" value={v.cls} options={classOpts} onChange={(x) => setV({ ...v, cls: x, field: fieldOpts.find((f) => f.classes.includes(x))?.value || "" })} />
      </div>
      <div>
        <span className="label">Stream</span>
        <Select key={v.cls} ariaLabel="Stream" value={v.field} options={fields} onChange={(x) => setV({ ...v, field: x })} />
      </div>
      <div>
        <span className="label">Board</span>
        <Select ariaLabel="Board" value={v.board} options={boardOpts} onChange={(x) => setV({ ...v, board: x })} />
      </div>
      <label>
        <span className="label">City</span>
        <input className="input" value={v.city} onChange={set("city")} />
      </label>
      <label>
        <span className="label">School</span>
        <input className="input" value={v.school} onChange={set("school")} />
      </label>
      <div className="flex items-center gap-3 md:col-span-3">
        <button className="btn-primary btn-sm" disabled={busy}>
          {busy ? "Saving..." : "Save profile"}
        </button>
        {saved && !msg && <span className="text-sm text-brand-700">Saved. If the class or stream changed, the roadmap now follows the new syllabus.</span>}
        {msg && <span className="text-sm text-accent-700">{msg}</span>}
      </div>
    </form>
  );
}

type BatchOpt = { value: string; label: string; price: number };

export function BatchControls({
  id,
  enrolled,
  start,
  options,
  addable = [],
  current,
}: {
  id: string;
  enrolled: boolean;
  start?: string;
  options: BatchOpt[]; // batches this student can be in (Class 12 Science: JEE / NEET / Boards)
  addable?: BatchOpt[]; // of those, the ones the student is not in yet (a student can be in several)
  current?: string;
}) {
  const { act, busy, msg } = useAct(id);
  const [batch, setBatch] = useState(current || options[0]?.value || "");
  const [amount, setAmount] = useState(String(options.find((o) => o.value === (current || options[0]?.value))?.price ?? 0));
  const [date, setDate] = useState(start || "");
  const pick = (v: string) => {
    setBatch(v);
    if (!enrolled) setAmount(String(options.find((o) => o.value === v)?.price ?? amount));
  };
  const picker =
    options.length > 1 ? (
      <label>
        <span className="label">Batch</span>
        <Select ariaLabel="Batch" value={batch} options={options.map((o) => ({ value: o.value, label: `${o.label} (₹${o.price})` }))} onChange={pick} />
      </label>
    ) : null;
  if (!enrolled)
    return (
      <div className="flex flex-wrap items-end gap-2">
        {picker}
        <label>
          <span className="label">Amount received (₹)</span>
          <input className="input w-36" type="number" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} />
        </label>
        <button className="btn-primary btn-sm" disabled={busy} onClick={() => act("enroll", { amount: Number(amount), batch }, "Add this student to this batch?")}>
          Add to batch
        </button>
        <button className="btn-accent btn-sm" disabled={busy} onClick={() => act("enroll", { batch, gift: true }, "Give this batch FREE (giveaway)? ₹0 is recorded and the student gets a notification.")}>
          🎁 Give free (giveaway)
        </button>
        {msg && <span className="text-sm text-accent-700">{msg}</span>}
      </div>
    );
  return (
    <div className="flex flex-wrap items-end gap-2">
      {picker && (
        <>
          {picker}
          <button
            className="btn-ghost btn-sm"
            disabled={busy || batch === current}
            onClick={() => act("batch", { batch }, "Move this student to the selected batch? Their roadmap, exam date and tests change to that batch. Ticked chapters are kept.")}
          >
            Move to this batch
          </button>
        </>
      )}
      <label>
        <span className="label">Roadmap start date</span>
        <input className="input w-44" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </label>
      <button className="btn-ghost btn-sm" disabled={busy} onClick={() => act("start", { date })}>
        Change start date
      </button>
      <button className="btn-ghost btn-sm text-accent-700" disabled={busy} onClick={() => act("unenroll", {}, "Remove this student from this batch? Their other batches stay. Their progress is kept.")}>
        Remove from batch
      </button>
      {msg && <span className="text-sm text-accent-700">{msg}</span>}
      {addable.length > 0 && <AddAnother id={id} options={addable} />}
    </div>
  );
}

export function ChapterRow({ id, chapterId, title, learn, practice, hasVideo }: { id: string; chapterId: string; title: string; learn: boolean; practice: boolean; hasVideo?: boolean }) {
  const { act, busy } = useAct(id);
  const both = learn && practice;
  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-slate-200 py-2 text-sm">
      <span className={`min-w-0 flex-1 ${both ? "text-slate-500 line-through" : ""}`}>{title}</span>
      <label className="flex items-center gap-1.5">
        <input type="checkbox" checked={learn} disabled={busy} onChange={(e) => act("step", { id: `${chapterId}:learn`, done: e.target.checked })} /> Learn
      </label>
      <label className="flex items-center gap-1.5">
        <input type="checkbox" checked={practice} disabled={busy} onChange={(e) => act("step", { id: `${chapterId}:practice`, done: e.target.checked })} /> Practice
      </label>
      <button className="text-xs font-semibold text-brand-700 underline" disabled={busy} onClick={() => act("chapter", { id: chapterId, done: !both })}>
        {both ? "Clear" : "Mark done"}
      </button>
      <a className={`text-xs font-semibold underline ${hasVideo ? "text-brand-700" : "text-accent-700"}`} href={materialHref(chapterId)} target="_blank" rel="noreferrer">
        {hasVideo ? "Video & DPP" : "Add video & DPP"}
      </a>
    </li>
  );
}

export function SubjectButtons({ id, subject }: { id: string; subject: string }) {
  const { act, busy } = useAct(id);
  return (
    <span className="flex gap-2">
      <button className="btn-ghost btn-sm" disabled={busy} onClick={() => act("subject", { subject, done: true }, "Mark every chapter of this subject done?")}>
        All done
      </button>
      <button className="btn-ghost btn-sm" disabled={busy} onClick={() => act("subject", { subject, done: false }, "Clear progress for this subject?")}>
        Clear
      </button>
    </span>
  );
}

export function SmallAction({ id, action, label, extra = {}, confirmText, danger = false }: { id: string; action: string; label: string; extra?: Record<string, unknown>; confirmText?: string; danger?: boolean }) {
  const { act, busy, msg } = useAct(id);
  return (
    <span className="inline-flex items-center gap-2">
      <button className={`btn-ghost btn-sm ${danger ? "text-accent-700" : ""}`} disabled={busy} onClick={() => act(action, extra, confirmText)}>
        {label}
      </button>
      {msg && <span className="text-xs text-accent-700">{msg}</span>}
    </span>
  );
}

/** Add the student to one more batch (they keep the ones they have). */
function AddAnother({ id, options }: { id: string; options: BatchOpt[] }) {
  const { act, busy, msg } = useAct(id);
  const [batch, setBatch] = useState(options[0]?.value || "");
  const [amount, setAmount] = useState(String(options[0]?.price ?? 0));
  return (
    <div className="mt-3 flex w-full flex-wrap items-end gap-2 border-t border-slate-200 pt-3">
      <label>
        <span className="label">Add one more batch</span>
        <Select
          ariaLabel="Another batch"
          value={batch}
          options={options.map((o) => ({ value: o.value, label: `${o.label} (₹${o.price})` }))}
          onChange={(v) => {
            setBatch(v);
            setAmount(String(options.find((o) => o.value === v)?.price ?? amount));
          }}
        />
      </label>
      <label>
        <span className="label">Amount received (₹)</span>
        <input className="input w-36" type="number" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} />
      </label>
      <button className="btn-primary btn-sm" disabled={busy} onClick={() => act("enroll", { amount: Number(amount), batch }, "Add this student to one more batch? Their current batches stay.")}>
        Add batch
      </button>
      <button className="btn-accent btn-sm" disabled={busy} onClick={() => act("enroll", { batch, gift: true }, "Give this batch FREE (giveaway)? ₹0 is recorded and the student gets a notification.")}>
        🎁 Give free
      </button>
      {msg && <span className="text-sm text-accent-700">{msg}</span>}
    </div>
  );
}
