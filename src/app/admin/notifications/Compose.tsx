"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Select from "@/components/Select";

type Opt = { value: string; label: string };
type Stu = { id: string; name: string; mobile: string; cls: string; enrolled: boolean };

export default function Compose({
  classOpts,
  fieldOpts,
  initial,
  initialStudent,
}: {
  classOpts: Opt[];
  fieldOpts: (Opt & { classes: string[] })[];
  initial: { to: string; cls: string; field: string; student: string };
  initialStudent?: Stu;
}) {
  const router = useRouter();
  const [to, setTo] = useState(initial.to || "all");
  const [cls, setCls] = useState(initial.cls);
  const [field, setField] = useState(initial.field);
  const [student, setStudent] = useState(initial.student);
  const [q, setQ] = useState("");
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [link, setLink] = useState("");
  const [count, setCount] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);

  const fields = fieldOpts.filter((f) => !cls || f.classes.includes(cls));
  const [picked, setPicked] = useState<Stu | undefined>(initialStudent);
  const [matches, setMatches] = useState<Stu[]>([]);
  const [searching, setSearching] = useState(false);
  // search on the server (there can be lakhs of students), a moment after typing stops
  useEffect(() => {
    const k = q.trim();
    if (k.length < 2) return setMatches([]);
    setSearching(true);
    const t = setTimeout(() => {
      fetch(`/api/admin/search-students?q=${encodeURIComponent(k)}`)
        .then((r) => r.json())
        .then((r) => setMatches(r.ok ? r.list : []))
        .catch(() => setMatches([]))
        .finally(() => setSearching(false));
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    if (field && !fields.some((f) => f.value === field)) setField("");
  }, [cls]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let live = true;
    setCount(null);
    if ((to === "class" && !cls) || (to === "student" && !student)) return;
    fetch("/api/admin/notifications", { method: "POST", body: JSON.stringify({ preview: true, to, cls, field, student }) })
      .then((r) => r.json())
      .then((r) => live && r.ok && setCount(r.recipients))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [to, cls, field, student]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const r = await fetch("/api/admin/notifications", { method: "POST", body: JSON.stringify({ to, cls, field, student, title, body: text, link }) })
      .then((r) => r.json())
      .catch(() => null);
    setBusy(false);
    if (!r?.ok) return setMsg({ ok: false, t: r?.error || "Could not send." });
    setMsg({ ok: true, t: `Sent to ${r.recipients} student${r.recipients === 1 ? "" : "s"}.` });
    setTitle("");
    setText("");
    setLink("");
    router.refresh();
  }

  const tabs: [string, string][] = [
    ["all", "Everyone"],
    ["class", "A class"],
    ["batch", "A batch"],
    ["student", "One student"],
  ];

  return (
    <form onSubmit={send} className="grid gap-4">
      <div>
        <p className="label">Who gets it</p>
        <div className="mt-1 flex flex-wrap gap-2">
          {tabs.map(([v, l]) => (
            <button type="button" key={v} onClick={() => setTo(v)} className={`btn btn-sm ${to === v ? "bg-brand-800 text-white" : "btn-ghost"}`}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {(to === "class" || to === "batch") && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label">Class</label>
            <Select ariaLabel="Class" value={cls} onChange={setCls} options={[...(to === "batch" ? [{ value: "", label: "All classes" }] : []), ...classOpts]} placeholder="Pick a class" />
          </div>
          {to === "batch" && (
            <div>
              <label className="label">Stream</label>
              <Select ariaLabel="Stream" value={field} onChange={setField} options={[{ value: "", label: "All streams" }, ...fields]} />
            </div>
          )}
        </div>
      )}
      {to === "batch" && <p className="-mt-2 text-xs text-slate-500">Only students who have joined a batch (paid, demo or added by you).</p>}
      {to === "class" && <p className="-mt-2 text-xs text-slate-500">Every student of this class with a profile, in a batch or not.</p>}

      {to === "student" && (
        <div>
          <label className="label">Student</label>
          {picked ? (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 p-3">
              <b>{picked.name}</b>
              <span className="text-sm text-slate-600">
                {picked.mobile}, Class {picked.cls}
                {picked.enrolled ? ", in batch" : ""}
              </span>
              <button type="button" className="ml-auto text-sm font-semibold text-accent-700 underline" onClick={() => {
                  setStudent("");
                  setPicked(undefined);
                }}>
                Change
              </button>
            </div>
          ) : (
            <>
              <input className="input" placeholder="Type a name or mobile" value={q} onChange={(e) => setQ(e.target.value)} />
              {matches.length > 0 && (
                <ul className="mt-1 divide-y divide-slate-100 rounded-lg border border-slate-200">
                  {matches.map((s) => (
                    <li key={s.id}>
                      <button
                        type="button"
                        className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                        onClick={() => {
                          setStudent(s.id);
                          setPicked(s);
                          setQ("");
                        }}
                      >
                        <b>{s.name}</b> <span className="text-slate-500">{s.mobile}, Class {s.cls}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {q.trim().length >= 2 && !searching && matches.length === 0 && <p className="mt-1 text-sm text-slate-500">No student found.</p>}
            </>
          )}
        </div>
      )}

      <div>
        <label className="label" htmlFor="n-title">Title</label>
        <input id="n-title" className="input" maxLength={120} placeholder="e.g. Physics live class moved to 7 pm" value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div>
        <label className="label" htmlFor="n-body">Message</label>
        <textarea id="n-body" className="input min-h-28 py-3" maxLength={2000} placeholder="What the student should know or do" value={text} onChange={(e) => setText(e.target.value)} />
      </div>
      <div>
        <label className="label" htmlFor="n-link">Link (optional)</label>
        <input id="n-link" className="input" placeholder="https://meet.google.com/... or /masterclass" value={link} onChange={(e) => setLink(e.target.value)} />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button className="btn-primary" disabled={busy || !count}>
          {busy ? "Sending..." : count ? `Send to ${count} student${count === 1 ? "" : "s"}` : "Send"}
        </button>
        {count === 0 && <span className="text-sm text-accent-700">Nobody matches this yet.</span>}
        {msg && <span className={`text-sm font-semibold ${msg.ok ? "text-brand-700" : "text-accent-700"}`}>{msg.t}</span>}
      </div>
      <p className="text-xs text-slate-500">Students see it in the bell on their dashboard. It does not go to WhatsApp or SMS.</p>
    </form>
  );
}
