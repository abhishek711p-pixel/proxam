"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Select from "@/components/Select";
import { FIELDS, type ClassLevel } from "@/lib/config";
import { MC_TRACK } from "@/lib/masterclass";

export type McFormValues = { cls: string; field: string; title: string; desc: string; host: string; date: string; time: string; minutes: number; price: number; meetingLink: string };

const CLASS_OPTS = [
  { value: "10", label: "Class 10" },
  { value: "11", label: "Class 11" },
  { value: "12", label: "Class 12" },
  { value: "dropper", label: "Dropper" },
];

/** Create (no id) or edit (with id) a masterclass. Date and time are in India time. */
export default function McAdminForm({ id, initial, onDone }: { id?: string; initial: McFormValues; onDone?: () => void }) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const set = (k: keyof McFormValues) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setV({ ...v, [k]: e.target.value });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    const r = await fetch(id ? `/api/admin/masterclasses/${id}` : "/api/admin/masterclasses", {
      method: id ? "PATCH" : "POST",
      body: JSON.stringify(v),
    })
      .then((r) => r.json())
      .catch(() => null);
    setBusy(false);
    if (!r?.ok) return setMsg(r?.error || "Could not save.");
    setMsg("Saved.");
    router.refresh();
    onDone?.();
  }

  return (
    <form onSubmit={save} className="grid gap-3 md:grid-cols-6">
      <div className="md:col-span-2">
        <span className="label">Batch (class)</span>
        <Select name="cls" ariaLabel="Class" options={CLASS_OPTS} defaultValue={v.cls} onChange={(x) => setV({ ...v, cls: x, field: "" })} />
      </div>
      <div className="md:col-span-2">
        <span className="label">Stream (who can book)</span>
        <Select
          key={v.cls}
          name="field"
          ariaLabel="Stream"
          options={[
            { value: "", label: "Every student of this class" },
            ...Object.values(FIELDS)
              .filter((f) => f.classes.includes(v.cls as ClassLevel))
              .map((f) => ({ value: f.id, label: MC_TRACK[f.id].en })),
          ]}
          defaultValue={v.field}
          onChange={(x) => setV({ ...v, field: x })}
        />
      </div>
      <label className="md:col-span-1">
        <span className="label">Date (India time)</span>
        <input className="input" type="date" value={v.date} onChange={set("date")} required />
      </label>
      <label className="md:col-span-1">
        <span className="label">Time (India time)</span>
        <input className="input" type="time" value={v.time} onChange={set("time")} required />
      </label>
      <label className="md:col-span-6">
        <span className="label">Title</span>
        <input className="input" value={v.title} onChange={set("title")} maxLength={140} required />
      </label>
      <label className="md:col-span-6">
        <span className="label">What students will learn</span>
        <textarea className="input min-h-24 py-3" value={v.desc} onChange={set("desc")} maxLength={600} />
      </label>
      <label className="md:col-span-2">
        <span className="label">Mentor name (optional)</span>
        <input className="input" value={v.host} onChange={set("host")} maxLength={80} />
      </label>
      <label>
        <span className="label">Minutes</span>
        <input className="input" type="number" min={15} max={240} value={v.minutes} onChange={set("minutes")} />
      </label>
      <label>
        <span className="label">Price (₹)</span>
        <input className="input" type="number" min={0} value={v.price} onChange={set("price")} />
      </label>
      <label className="md:col-span-2">
        <span className="label">Join link (optional)</span>
        <input className="input" type="url" placeholder="https://meet.google.com/..." value={v.meetingLink} onChange={set("meetingLink")} />
      </label>
      <div className="flex items-center gap-3 md:col-span-6">
        <button className="btn-primary" disabled={busy}>
          {busy ? "Saving..." : id ? "Save changes" : "Create masterclass"}
        </button>
        {msg && <span className={`text-sm ${msg === "Saved." ? "text-brand-700" : "text-accent-700"}`}>{msg}</span>}
      </div>
    </form>
  );
}
