import { allQuestions } from "@/lib/store";
import { FIELDS } from "@/lib/config";
import { ImportForm, ToggleActive } from "./QuestionsClient";

export default async function Questions({ searchParams }: { searchParams: Promise<{ subject?: string }> }) {
  const { subject } = await searchParams;
  const db = { questions: await allQuestions() };
  const subjects = Array.from(new Set(db.questions.map((q) => q.subject))).sort();

  // Bank health: active questions vs what one test needs (PRD: 5x).
  const need = new Map<string, number>();
  for (const f of Object.values(FIELDS)) for (const s of f.sections) need.set(s.subject, Math.max(need.get(s.subject) || 0, f.favourite && s.part === "A" ? f.favourite.count : s.count));
  const list = subject ? db.questions.filter((q) => q.subject === subject) : [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Question bank <span className="text-slate-400">({db.questions.length})</span></h1>

      <section className="card overflow-x-auto p-0">
        <table className="w-full min-w-[600px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr><th className="px-4 py-3">Subject</th><th className="px-4 py-3">Active</th><th className="px-4 py-3">Per test</th><th className="px-4 py-3">Target (5x)</th><th className="px-4 py-3">Hindi</th><th className="px-4 py-3" /></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {subjects.map((s) => {
              const qs = db.questions.filter((q) => q.subject === s);
              const active = qs.filter((q) => q.active).length;
              const per = need.get(s) || 0;
              const hi = qs.filter((q) => q.text.hi).length;
              return (
                <tr key={s}>
                  <td className="px-4 py-3 font-semibold">{s}</td>
                  <td className="px-4 py-3">{active}</td>
                  <td className="px-4 py-3">{per}</td>
                  <td className="px-4 py-3">
                    <span className={`pill ${active >= per * 5 ? "bg-brand-100 text-brand-700" : "bg-rose-100 text-rose-700"}`}>{active}/{per * 5}</span>
                  </td>
                  <td className="px-4 py-3">{hi}/{qs.length}</td>
                  <td className="px-4 py-3 text-right"><a href={`/admin/questions?subject=${encodeURIComponent(s)}`} className="font-semibold text-brand-600">View</a></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <ImportForm />

      {subject && (
        <section className="space-y-3">
          <h2 className="text-lg font-bold">{subject}</h2>
          {list.map((q) => (
            <div key={q.id} className={`card p-4 ${q.active ? "" : "opacity-50"}`}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="font-semibold">{q.text.en}</p>
                <ToggleActive id={q.id} active={q.active} />
              </div>
              <p className="mt-1 text-xs text-slate-500">Part {q.part} · {q.chapter} · {q.topic} · {q.difficulty} · {q.skill}</p>
              <ul className="mt-2 grid gap-1 text-sm md:grid-cols-2">
                {q.options.map((o) => (
                  <li key={o.id} className={o.id === q.answer ? "font-semibold text-brand-700" : ""}>
                    {o.id.toUpperCase()}. {o.en} {o.tag && <span className="text-xs text-slate-500">[{o.tag}]</span>} {o.id === q.answer && "✓"}
                  </li>
                ))}
              </ul>
              {q.explanation && <p className="mt-2 text-sm text-slate-600">💡 {q.explanation}</p>}
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
