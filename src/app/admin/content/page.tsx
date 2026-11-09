import Link from "next/link";
import { allChapterContent } from "@/lib/store";
import { chaptersOf, SUBJECT_NAME, subjectsOfLevel, type Level, type SubjectKey } from "@/lib/syllabus";
import ContentEditor from "./ContentEditor";

const LEVELS: Level[] = ["10", "11", "12"];

export default async function StudyMaterial({ searchParams }: { searchParams: Promise<{ cls?: string; subject?: string; open?: string }> }) {
  const sp = await searchParams;
  const level = (LEVELS.includes(sp.cls as Level) ? sp.cls : "12") as Level;
  const subjects = subjectsOfLevel(level);
  const subject = (subjects.includes(sp.subject as SubjectKey) ? sp.subject : subjects[0]) as SubjectKey;
  const chapters = chaptersOf(level, subject);
  const all = await allChapterContent();
  const withVideo = chapters.filter((c) => all[c.id]?.videos.length).length;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl">Study material</h1>
        <p className="text-sm text-slate-600">
          For every chapter: the YouTube video students should watch, notes PDFs and the DPP. It shows on the topic page of every batch student who has that chapter (droppers see Class 11 and 12 material).
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {LEVELS.map((l) => (
          <Link key={l} href={`/admin/content?cls=${l}`} className={`btn btn-sm ${l === level ? "bg-brand-800 text-white" : "btn-ghost"}`}>
            Class {l}
          </Link>
        ))}
      </div>
      <div className="flex flex-wrap gap-2 border-b border-slate-300 pb-3">
        {subjects.map((s) => (
          <Link key={s} href={`/admin/content?cls=${level}&subject=${s}`} className={`rounded-md px-3 py-1.5 text-sm font-semibold ${s === subject ? "bg-white text-brand-900 shadow-[inset_0_-2px_0_#cc5500]" : "text-slate-600 hover:bg-white"}`}>
            {SUBJECT_NAME[s].en}
          </Link>
        ))}
      </div>

      <p className="text-sm text-slate-600">
        {withVideo} of {chapters.length} chapters have a video. Chapters without one show students a YouTube search instead.
      </p>

      <ol className="space-y-2">
        {chapters.map((c, i) => {
          const m = all[c.id];
          const v = m?.videos.length || 0;
          const n = m?.notes.length || 0;
          const d = (m?.dpp.questions.length || 0) + (m?.dpp.pdf ? 1 : 0);
          return (
            <li key={c.id} id={c.id} className="scroll-mt-20">
              <details className="card p-0" open={sp.open === c.id}>
                <summary className="flex cursor-pointer flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3">
                  <span className="w-6 text-sm text-slate-400">{i + 1}</span>
                  <b className="min-w-0 flex-1">{c.title}</b>
                  <span className={`pill ${v ? "bg-brand-100 text-brand-800" : "bg-accent-100 text-accent-800"}`}>{v ? `${v} video${v > 1 ? "s" : ""}` : "No video"}</span>
                  <span className={`pill ${n ? "bg-brand-100 text-brand-800" : "bg-slate-100 text-slate-500"}`}>{n} notes</span>
                  <span className={`pill ${d ? "bg-brand-100 text-brand-800" : "bg-slate-100 text-slate-500"}`}>{d ? `DPP: ${m?.dpp.pdf ? "PDF" : ""}${m?.dpp.pdf && m.dpp.questions.length ? " + " : ""}${m?.dpp.questions.length ? `${m.dpp.questions.length} Q` : ""}` : "No DPP"}</span>
                </summary>
                <div className="border-t border-slate-200 px-4 pb-4">
                  <ContentEditor chapterId={c.id} title={c.title} initial={m} />
                </div>
              </details>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
