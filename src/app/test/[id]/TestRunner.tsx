"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { t } from "@/lib/i18n";
import type { Lang, PublicQuestion } from "@/lib/types";
import { PART_LABEL } from "@/lib/config";

type Saved = { answers: Record<string, string>; marked: string[]; timeSpent: Record<string, number>; idx: number };

const LETTERS = ["A", "B", "C", "D", "E"];

function fmt(sec: number) {
  const s = Math.max(0, Math.floor(sec));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

export default function TestRunner({ attemptId, lang, syncEverySec }: { attemptId: string; lang: Lang; syncEverySec: number }) {
  const router = useRouter();
  const key = `attempt:${attemptId}`;

  const [questions, setQuestions] = useState<PublicQuestion[] | null>(null);
  const [fieldLabel, setFieldLabel] = useState("");
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [marked, setMarked] = useState<string[]>([]);
  const [left, setLeft] = useState<number>(0);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [online, setOnline] = useState(true);
  const [error, setError] = useState("");

  const timeSpent = useRef<Record<string, number>>({});
  const expiresAt = useRef<number>(0);
  const clockOffset = useRef<number>(0);
  const dirty = useRef(false);
  const submittedRef = useRef(false);
  const state = useRef<Saved>({ answers: {}, marked: [], timeSpent: {}, idx: 0 });

  // Keep a ref copy so timers/unload handlers read fresh values.
  useEffect(() => {
    state.current = { answers, marked, timeSpent: timeSpent.current, idx };
  }, [answers, marked, idx]);

  const persistLocal = useCallback(() => {
    try {
      localStorage.setItem(key, JSON.stringify({ ...state.current, timeSpent: timeSpent.current }));
    } catch {}
  }, [key]);

  const handleAuth = useCallback(
    (status: number) => {
      if (status === 401) {
        router.replace("/login?reason=elsewhere");
        return true;
      }
      return false;
    },
    [router],
  );

  // ---------- load once ----------
  useEffect(() => {
    let alive = true;
    (async () => {
      const res = await fetch(`/api/attempts/${attemptId}`).catch(() => null);
      if (!res) return setError(t(lang, "error_generic"));
      if (handleAuth(res.status)) return;
      const r = await res.json();
      if (!alive) return;
      if (!r.ok) return setError(r.error || t(lang, "error_generic"));
      if (r.status !== "in_progress") {
        localStorage.removeItem(key);
        return router.replace(`/result/${attemptId}`);
      }
      clockOffset.current = new Date(r.serverNow).getTime() - Date.now();
      expiresAt.current = new Date(r.expiresAt).getTime();

      let saved: Saved | null = null;
      try {
        saved = JSON.parse(localStorage.getItem(key) || "null");
      } catch {}
      // Local copy wins: it has every tap, the server has the last 30-second sync.
      const a = { ...r.answers, ...(saved?.answers || {}) };
      const m = saved?.marked || r.marked || [];
      timeSpent.current = { ...r.timeSpent, ...(saved?.timeSpent || {}) };
      setAnswers(a);
      setMarked(m);
      setIdx(Math.min(saved?.idx || 0, r.questions.length - 1));
      setFieldLabel(r.field?.[lang] || r.field?.en || "");
      setQuestions(r.questions);
      setLeft((expiresAt.current - (Date.now() + clockOffset.current)) / 1000);
    })();
    return () => {
      alive = false;
    };
  }, [attemptId, key, lang, router, handleAuth]);

  // ---------- server sync ----------
  const sync = useCallback(
    async (keepalive = false) => {
      if (!dirty.current || submittedRef.current) return;
      dirty.current = false;
      const payload = JSON.stringify({ answers: state.current.answers, marked: state.current.marked, timeSpent: timeSpent.current });
      try {
        const res = await fetch(`/api/attempts/${attemptId}/sync`, { method: "POST", body: payload, keepalive });
        if (handleAuth(res.status)) return;
        if (res.status === 409) router.replace(`/result/${attemptId}`);
        if (!res.ok) dirty.current = true;
      } catch {
        dirty.current = true; // retry on the next tick
      }
    },
    [attemptId, handleAuth, router],
  );

  const submit = useCallback(
    async (auto = false) => {
      if (submittedRef.current) return;
      submittedRef.current = true;
      setSubmitting(true);
      setConfirmOpen(false);
      persistLocal();
      const payload = JSON.stringify({ answers: state.current.answers, timeSpent: timeSpent.current, auto });
      for (let i = 0; i < 5; i++) {
        try {
          const res = await fetch(`/api/attempts/${attemptId}/submit`, { method: "POST", body: payload });
          if (handleAuth(res.status)) return;
          const r = await res.json();
          if (r.ok) {
            localStorage.removeItem(key);
            router.replace(r.next);
            return;
          }
        } catch {}
        await new Promise((ok) => setTimeout(ok, 2000 * (i + 1)));
      }
      submittedRef.current = false;
      setSubmitting(false);
      setError(t(lang, "offline"));
    },
    [attemptId, handleAuth, key, lang, persistLocal, router],
  );

  // ---------- 1-second clock ----------
  const current = questions?.[idx];
  const currentId = useRef<string | null>(null);
  useEffect(() => {
    currentId.current = current?.id ?? null;
  }, [current]);

  useEffect(() => {
    if (!questions) return;
    let lastSync = Date.now();
    let lastLocal = Date.now();
    const timer = setInterval(() => {
      const now = Date.now();
      const remaining = (expiresAt.current - (now + clockOffset.current)) / 1000;
      setLeft(remaining);
      const qid = currentId.current;
      if (document.visibilityState === "visible" && qid) {
        timeSpent.current[qid] = (timeSpent.current[qid] || 0) + 1;
      }
      if (now - lastLocal >= 5000) {
        lastLocal = now;
        persistLocal();
      }
      if (now - lastSync >= syncEverySec * 1000) {
        lastSync = now;
        sync();
      }
      if (remaining <= 0) submit(true);
    }, 1000);
    return () => clearInterval(timer);
  }, [questions, persistLocal, sync, submit, syncEverySec]);

  // ---------- online / leaving the page ----------
  useEffect(() => {
    const on = () => {
      setOnline(true);
      sync();
    };
    const off = () => setOnline(false);
    const hide = () => {
      if (document.visibilityState === "hidden") {
        persistLocal();
        sync(true);
      }
    };
    setOnline(navigator.onLine);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    document.addEventListener("visibilitychange", hide);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
      document.removeEventListener("visibilitychange", hide);
    };
  }, [persistLocal, sync]);

  // ---------- actions ----------
  function choose(optionId: string) {
    if (!current) return;
    setAnswers((a) => {
      const next = { ...a, [current.id]: optionId };
      state.current.answers = next;
      return next;
    });
    dirty.current = true;
    queueMicrotask(persistLocal);
  }
  function clearAnswer() {
    if (!current) return;
    setAnswers((a) => {
      const next = { ...a };
      delete next[current.id];
      state.current.answers = next;
      return next;
    });
    dirty.current = true;
    queueMicrotask(persistLocal);
  }
  function toggleMark() {
    if (!current) return;
    setMarked((m) => {
      const next = m.includes(current.id) ? m.filter((x) => x !== current.id) : [...m, current.id];
      state.current.marked = next;
      return next;
    });
    dirty.current = true;
  }
  function go(i: number) {
    if (!questions) return;
    setIdx(Math.max(0, Math.min(questions.length - 1, i)));
    setPaletteOpen(false);
    window.scrollTo({ top: 0 });
  }

  // ---------- render ----------
  if (error && !questions) {
    return (
      <main className="container-x py-16">
        <p className="error">{error}</p>
      </main>
    );
  }
  if (!questions || !current) {
    return (
      <main className="flex min-h-dvh items-center justify-center text-slate-500">
        <span className="animate-pulse">{t(lang, "loading")}</span>
      </main>
    );
  }

  const answeredCount = questions.filter((q) => answers[q.id]).length;
  const markedCount = marked.length;
  const isLast = idx === questions.length - 1;
  const lowTime = left < 120;

  const Palette = (
    <div>
      <div className="mb-3 flex flex-wrap gap-3 text-xs text-slate-600">
        <span className="flex items-center gap-1.5">
          <i className="h-3 w-3 rounded bg-brand-500" /> {t(lang, "answered")} {answeredCount}
        </span>
        <span className="flex items-center gap-1.5">
          <i className="h-3 w-3 rounded bg-accent-400" /> {t(lang, "marked")} {markedCount}
        </span>
        <span className="flex items-center gap-1.5">
          <i className="h-3 w-3 rounded border border-slate-300 bg-white" /> {t(lang, "not_answered")} {questions.length - answeredCount}
        </span>
      </div>
      {(["A", "B", "C"] as const).map((part) => {
        const list = questions.map((q, i) => ({ q, i })).filter(({ q }) => q.part === part);
        if (!list.length) return null;
        return (
          <div key={part} className="mb-3">
            <p className="mb-2 text-sm font-semibold text-slate-500">
              Part {part}: {PART_LABEL[part][lang]}
            </p>
            <div className="grid grid-cols-6 gap-2 lg:grid-cols-5">
              {list.map(({ q, i }) => {
                const a = Boolean(answers[q.id]);
                const m = marked.includes(q.id);
                return (
                  <button
                    key={q.id}
                    onClick={() => go(i)}
                    className={`relative h-11 rounded-lg text-sm font-semibold ${
                      a ? "bg-brand-500 text-white" : "border border-slate-300 bg-white text-slate-700"
                    } ${i === idx ? "ring-2 ring-brand-500 ring-offset-2" : ""}`}
                    aria-label={`${t(lang, "question")} ${i + 1}`}
                  >
                    {i + 1}
                    {m && <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-accent-400 ring-2 ring-white" />}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );

  const text = (o: { en: string; hi?: string }) => (lang === "hi" && o.hi ? o.hi : o.en);

  return (
    <div className="min-h-dvh bg-slate-50 pb-28 lg:pb-8">
      {/* top bar */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
        <div className="container-x flex h-14 items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-xs text-slate-500">{fieldLabel}</p>
            <p className="text-sm font-bold">
              {t(lang, "question")} {idx + 1} {t(lang, "of")} {questions.length}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`rounded-lg px-3 py-1.5 font-mono text-base font-bold tabular-nums ${
                lowTime ? "animate-pulse bg-accent-100 text-accent-700" : "bg-slate-100 text-slate-800"
              }`}
              aria-label={t(lang, "time_left")}
            >
              ⏱ {fmt(left)}
            </span>
            <button className="btn-ghost btn-sm lg:hidden" onClick={() => setPaletteOpen(true)} aria-label={t(lang, "all_questions")}>
              ☷
            </button>
            <button className="btn-primary btn-sm hidden lg:inline-flex" onClick={() => setConfirmOpen(true)}>
              {t(lang, "submit")}
            </button>
          </div>
        </div>
        <div className="h-1 bg-slate-100">
          <div className="h-1 bg-brand-500 transition-all" style={{ width: `${(answeredCount / questions.length) * 100}%` }} />
        </div>
      </header>

      {!online && <p className="bg-accent-100 px-4 py-2 text-center text-sm text-accent-800">{t(lang, "offline")}</p>}
      {error && questions && <p className="bg-accent-100 px-4 py-2 text-center text-sm text-accent-700">{error}</p>}

      <div className="container-x grid gap-6 py-4 md:py-6 lg:grid-cols-[1fr_320px]">
        {/* question */}
        <section>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="pill bg-brand-100 text-brand-700">Part {current.part}</span>
            <span className="pill bg-slate-200 text-slate-700">{current.subject}</span>
            {marked.includes(current.id) && <span className="pill bg-accent-100 text-accent-800">★ {t(lang, "marked")}</span>}
          </div>
          <h1 className="text-lg font-semibold leading-relaxed md:text-xl">{text(current.text)}</h1>

          <div className="mt-5 space-y-3" role="radiogroup">
            {current.options.map((o, i) => {
              const sel = answers[current.id] === o.id;
              return (
                <button
                  key={o.id}
                  role="radio"
                  aria-checked={sel}
                  onClick={() => choose(o.id)}
                  className={`flex min-h-14 w-full items-center gap-3 rounded-xl border-2 px-4 py-3 text-left text-base transition ${
                    sel ? "border-brand-600 bg-brand-50" : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                      sel ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {LETTERS[i]}
                  </span>
                  <span>{text(o)}</span>
                </button>
              );
            })}
          </div>

          {answers[current.id] && (
            <button className="mt-3 text-sm font-semibold text-slate-500 underline" onClick={clearAnswer}>
              {t(lang, "clear")}
            </button>
          )}

          {/* desktop nav */}
          <div className="mt-8 hidden gap-3 lg:flex">
            <button className="btn-ghost" onClick={() => go(idx - 1)} disabled={idx === 0}>
              ‹ {t(lang, "prev")}
            </button>
            <button className="btn-ghost" onClick={toggleMark}>
              {marked.includes(current.id) ? t(lang, "unmark") : `★ ${t(lang, "mark")}`}
            </button>
            {isLast ? (
              <button className="btn-primary ml-auto" onClick={() => setConfirmOpen(true)}>
                {t(lang, "submit_test")}
              </button>
            ) : (
              <button className="btn-primary ml-auto" onClick={() => go(idx + 1)}>
                {t(lang, "next")} ›
              </button>
            )}
          </div>
        </section>

        {/* desktop palette */}
        <aside className="hidden lg:block">
          <div className="card sticky top-20">
            <p className="mb-3 font-semibold">{t(lang, "all_questions")}</p>
            {Palette}
            <button className="btn-primary mt-2 w-full" onClick={() => setConfirmOpen(true)}>
              {t(lang, "submit_test")}
            </button>
          </div>
        </aside>
      </div>

      {/* mobile bottom bar */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden">
        <div className="mx-auto grid max-w-xl grid-cols-[auto_auto_1fr] gap-2">
          <button className="btn-ghost px-4" onClick={() => go(idx - 1)} disabled={idx === 0} aria-label={t(lang, "prev")}>
            ‹
          </button>
          <button
            className={`btn-ghost px-4 ${marked.includes(current.id) ? "border-accent-400 bg-accent-50 text-accent-800" : ""}`}
            onClick={toggleMark}
            aria-label={t(lang, "mark")}
          >
            ★
          </button>
          {isLast ? (
            <button className="btn-primary" onClick={() => setConfirmOpen(true)}>
              {t(lang, "submit_test")}
            </button>
          ) : (
            <button className="btn-primary" onClick={() => go(idx + 1)}>
              {t(lang, "next")} ›
            </button>
          )}
        </div>
      </nav>

      {/* mobile palette sheet */}
      {paletteOpen && (
        <div className="fixed inset-0 z-40 flex items-end bg-slate-900/40 lg:hidden" onClick={() => setPaletteOpen(false)}>
          <div className="max-h-[80dvh] w-full overflow-y-auto rounded-t-3xl bg-white p-5" onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-slate-300" />
            <p className="mb-3 text-lg font-bold">{t(lang, "all_questions")}</p>
            {Palette}
            <button
              className="btn-primary mt-2 w-full"
              onClick={() => {
                setPaletteOpen(false);
                setConfirmOpen(true);
              }}
            >
              {t(lang, "submit_test")}
            </button>
          </div>
        </div>
      )}

      {/* confirm submit */}
      {(confirmOpen || submitting) && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 md:items-center md:p-4">
          <div className="w-full max-w-md rounded-t-xl bg-white p-6 md:rounded-xl">
            {submitting ? (
              <p className="py-6 text-center text-lg font-semibold">{t(lang, "submitting")}</p>
            ) : (
              <>
                <p className="text-xl font-bold">{t(lang, "confirm_submit")}</p>
                <p className="mt-1 text-slate-600">{t(lang, "confirm_submit_d")}</p>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl bg-brand-50 p-3">
                    <p className="text-2xl font-bold text-brand-700">{answeredCount}</p>
                    <p className="text-xs text-slate-600">{t(lang, "answered")}</p>
                  </div>
                  <div className="rounded-xl bg-slate-100 p-3">
                    <p className="text-2xl font-bold">{questions.length - answeredCount}</p>
                    <p className="text-xs text-slate-600">{t(lang, "not_answered")}</p>
                  </div>
                  <div className="rounded-xl bg-accent-50 p-3">
                    <p className="text-2xl font-bold text-accent-700">{markedCount}</p>
                    <p className="text-xs text-slate-600">{t(lang, "marked")}</p>
                  </div>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-2">
                  <button className="btn-ghost" onClick={() => setConfirmOpen(false)}>
                    {t(lang, "keep_going")}
                  </button>
                  <button className="btn-primary" onClick={() => submit(false)}>
                    {t(lang, "yes_submit")}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
