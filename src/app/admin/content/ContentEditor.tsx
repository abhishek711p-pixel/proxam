"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUp, CirclePlay as Youtube, FileText, Plus, Trash2 } from "lucide-react";
import { youtubeId } from "@/lib/youtube";
import type { ChapterContent } from "@/lib/types";

type Link = { title: string; url: string };
type QA = { q: string; a: string };

function Rows({ rows, set, placeholderTitle, placeholderUrl, video }: { rows: Link[]; set: (r: Link[]) => void; placeholderTitle: string; placeholderUrl: string; video?: boolean }) {
  return (
    <div className="grid gap-2">
      {rows.map((r, i) => {
        const id = video ? youtubeId(r.url) : undefined;
        const bad = video && r.url.trim() && !id;
        return (
          <div key={i} className="grid items-start gap-2 rounded-lg border border-slate-200 bg-white p-2 sm:grid-cols-[96px_1fr_auto]">
            {video ? (
              id ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`https://i.ytimg.com/vi/${id}/mqdefault.jpg`} alt="" className="aspect-video w-24 rounded object-cover" />
              ) : (
                <div className="grid aspect-video w-24 place-items-center rounded bg-slate-100 text-slate-400">
                  <Youtube size={22} />
                </div>
              )
            ) : (
              <div className="grid aspect-video w-24 place-items-center rounded bg-slate-100 text-slate-400">
                <FileText size={22} />
              </div>
            )}
            <div className="grid gap-1.5">
              <input className="input h-10" placeholder={placeholderTitle} value={r.title} onChange={(e) => set(rows.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} />
              <input className={`input h-10 ${bad ? "border-accent-500" : ""}`} placeholder={placeholderUrl} value={r.url} onChange={(e) => set(rows.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))} />
              {bad && <span className="text-xs text-accent-700">This is not a YouTube video link.</span>}
              {video && i === 0 && id && <span className="text-xs font-semibold text-brand-700">Main video: plays first for the student</span>}
            </div>
            <div className="flex gap-1 sm:flex-col">
              {i > 0 && (
                <button type="button" className="rounded p-1.5 hover:bg-slate-100" aria-label="Move up" onClick={() => set(rows.map((x, j) => (j === i - 1 ? rows[i] : j === i ? rows[i - 1] : x)))}>
                  <ArrowUp size={16} />
                </button>
              )}
              <button type="button" className="rounded p-1.5 text-accent-700 hover:bg-slate-100" aria-label="Remove" onClick={() => set(rows.filter((_, j) => j !== i))}>
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function ContentEditor({ chapterId, title, initial }: { chapterId: string; title: string; initial?: ChapterContent }) {
  const router = useRouter();
  const [videos, setVideos] = useState<Link[]>(initial?.videos.length ? initial.videos : [{ title: "", url: "" }]);
  const [notes, setNotes] = useState<Link[]>(initial?.notes || []);
  const [pdf, setPdf] = useState<Link>(initial?.dpp.pdf || { title: "", url: "" });
  const [qs, setQs] = useState<QA[]>(initial?.dpp.questions.map((x) => ({ q: x.q, a: x.a || "" })) || []);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);

  async function save() {
    setBusy(true);
    setMsg(null);
    const r = await fetch("/api/admin/content", { method: "POST", body: JSON.stringify({ chapterId, videos, notes, dpp: { pdf, questions: qs } }) })
      .then((r) => r.json())
      .catch(() => null);
    setBusy(false);
    if (!r?.ok) return setMsg({ ok: false, t: r?.error || "Could not save." });
    setMsg({ ok: true, t: `Saved: ${r.videos} video${r.videos === 1 ? "" : "s"}, ${r.notes} notes, ${r.dpp} DPP item${r.dpp === 1 ? "" : "s"}. Students see it within a minute.` });
    router.refresh();
  }

  return (
    <div className="grid gap-5 pt-3">
      <section>
        <h4 className="mb-1 flex items-center gap-2 font-bold">
          <Youtube size={18} className="text-accent-600" /> YouTube videos
        </h4>
        <p className="mb-2 text-xs text-slate-500">The first video is the one the student sees on &quot;{title}&quot;. Paste a normal YouTube link. Add &amp;t=90 to start at 1:30.</p>
        <Rows rows={videos} set={setVideos} video placeholderTitle="Video title, e.g. Full chapter in one shot" placeholderUrl="https://www.youtube.com/watch?v=..." />
        <button type="button" className="btn-ghost btn-sm mt-2" onClick={() => setVideos([...videos, { title: "", url: "" }])}>
          <Plus size={15} /> Add a video
        </button>
      </section>

      <section>
        <h4 className="mb-1 flex items-center gap-2 font-bold">
          <FileText size={18} className="text-brand-700" /> Notes (PDF)
        </h4>
        <p className="mb-2 text-xs text-slate-500">Upload the PDF to Google Drive, click Share, set &quot;Anyone with the link&quot;, and paste the link here.</p>
        <Rows rows={notes} set={setNotes} placeholderTitle="e.g. Short notes + formula sheet" placeholderUrl="https://drive.google.com/file/d/..." />
        <button type="button" className="btn-ghost btn-sm mt-2" onClick={() => setNotes([...notes, { title: "", url: "" }])}>
          <Plus size={15} /> Add notes
        </button>
      </section>

      <section>
        <h4 className="mb-1 font-bold">DPP (daily practice problems)</h4>
        <p className="mb-2 text-xs text-slate-500">A DPP PDF, typed questions with answers, or both. Typed questions show on the topic page with a &quot;Show answer&quot; button.</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <input className="input h-10" placeholder="DPP PDF title (optional)" value={pdf.title} onChange={(e) => setPdf({ ...pdf, title: e.target.value })} />
          <input className="input h-10" placeholder="DPP PDF link (optional)" value={pdf.url} onChange={(e) => setPdf({ ...pdf, url: e.target.value })} />
        </div>
        <div className="mt-2 grid gap-2">
          {qs.map((r, i) => (
            <div key={i} className="grid gap-2 rounded-lg border border-slate-200 bg-white p-2 sm:grid-cols-[1fr_1fr_auto]">
              <textarea className="input min-h-16 py-2" placeholder={`Question ${i + 1}`} value={r.q} onChange={(e) => setQs(qs.map((x, j) => (j === i ? { ...x, q: e.target.value } : x)))} />
              <textarea className="input min-h-16 py-2" placeholder="Answer or solution hint" value={r.a} onChange={(e) => setQs(qs.map((x, j) => (j === i ? { ...x, a: e.target.value } : x)))} />
              <button type="button" className="self-start rounded p-1.5 text-accent-700 hover:bg-slate-100" aria-label="Remove question" onClick={() => setQs(qs.filter((_, j) => j !== i))}>
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
        <button type="button" className="btn-ghost btn-sm mt-2" onClick={() => setQs([...qs, { q: "", a: "" }])}>
          <Plus size={15} /> Add a question
        </button>
      </section>

      <div className="flex flex-wrap items-center gap-3 border-t border-slate-200 pt-3">
        <button type="button" className="btn-primary btn-sm" disabled={busy} onClick={save}>
          {busy ? "Saving..." : "Save study material"}
        </button>
        {msg && <span className={`text-sm font-semibold ${msg.ok ? "text-brand-700" : "text-accent-700"}`}>{msg.t}</span>}
      </div>
    </div>
  );
}
