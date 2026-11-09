"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { t } from "@/lib/i18n";
import { testSubjectLabel, type Section } from "@/lib/config";
import type { Lang } from "@/lib/types";

type Fav = { options: string[]; count: number; others: number };

/**
 * Test plan + start. Shows what the test contains; for PCM/PCB it first asks the favourite subject
 * (that subject gets more questions). With `pay`, it first buys one ₹49 test, then starts it.
 */
export default function StartButton({
  lang,
  pay = false,
  demo = false,
  sections = [],
  fav,
}: {
  lang: Lang;
  pay?: boolean;
  demo?: boolean;
  sections?: Section[];
  fav?: Fav;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [pick, setPick] = useState("");
  const post = (url: string, body?: unknown) =>
    fetch(url, { method: "POST", headers: body ? { "content-type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined })
      .then((r) => r.json())
      .catch(() => null);

  const needPick = Boolean(fav && !pick);
  const rows = sections.map((s) => ({
    ...s,
    count: fav && pick && s.part === "A" ? (s.subject === pick ? fav.count : fav.others) : s.count,
  }));
  const total = rows.reduce((n, s) => n + s.count, 0);

  async function start() {
    if (needPick) return setError(t(lang, "fav_need"));
    setBusy(true);
    setError("");
    if (pay) {
      const b = await post("/api/attempts/buy");
      if (b?.error === "session") return router.replace("/login?reason=elsewhere");
      if (!b?.ok) {
        setBusy(false);
        return setError(b?.error || t(lang, "error_generic"));
      }
    }
    const r = await post("/api/attempts/start", fav ? { favSubject: pick } : {});
    if (r?.error === "session") return router.replace("/login?reason=elsewhere");
    if (!r?.ok) {
      setBusy(false);
      return setError(r?.error || t(lang, "error_generic"));
    }
    router.push(`/test/${r.attemptId}`);
  }

  return (
    <div className="space-y-4">
      {fav && (
        <div className="card border-2 border-brand-700">
          <h2 className="text-xl">{t(lang, "fav_t")}</h2>
          <p className="mt-1 text-sm text-slate-600">
            {t(lang, "fav_d").replace("{n}", String(fav.count)).replaceAll("{m}", String(fav.others))}
          </p>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
            {fav.options.map((o) => (
              <button
                key={o}
                type="button"
                aria-pressed={pick === o}
                onClick={() => {
                  setPick(o);
                  setError("");
                }}
                className={`rounded-lg border-2 px-4 py-3 text-left font-semibold transition ${
                  pick === o ? "border-brand-800 bg-brand-800 text-white" : "border-slate-300 bg-white text-brand-900 hover:border-brand-700"
                }`}
              >
                {testSubjectLabel(o, lang)}
              </button>
            ))}
          </div>
        </div>
      )}

      {rows.length > 0 && (
        <div className="card">
          <div className="flex items-baseline justify-between border-b border-slate-300 pb-2">
            <h3 className="text-base">{t(lang, "test_plan")}</h3>
            <span className="text-sm font-semibold text-brand-800">{total} Q</span>
          </div>
          <ul className="mt-2 space-y-2">
            {rows.map((s) => (
              <li key={s.subject} className="flex items-center justify-between gap-3 text-sm">
                <span>
                  {testSubjectLabel(s.subject, lang)}
                  {fav && pick === s.subject && (
                    <span className="ml-2 rounded-full bg-accent-50 px-2 py-0.5 text-xs font-semibold text-accent-800">{t(lang, "fav_badge")}</span>
                  )}
                </span>
                <span className="font-semibold text-slate-700">{fav && !pick && s.part === "A" ? `${fav.others}-${fav.count}` : s.count} Q</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="no-print sticky bottom-0 -mx-4 border-t border-slate-300 bg-slate-50/95 p-4 backdrop-blur md:static md:mx-0 md:border-0 md:bg-transparent md:p-0">
        {error && <p className="error mb-3">{error}</p>}
        <button className={`${pay ? "btn-accent" : "btn-primary"} w-full text-lg md:w-auto md:px-8`} onClick={start} disabled={busy}>
          {busy ? t(lang, "loading") : pay ? t(lang, "pay_start_test") : t(lang, "start_test")}
        </button>
        {needPick && <p className="mt-2 text-xs text-slate-500">{t(lang, "fav_need")}</p>}
        {pay && demo && <p className="mt-2 rounded-md bg-accent-50 px-3 py-2 text-xs text-accent-800">{t(lang, "demo_pay_test")}</p>}
      </div>
    </div>
  );
}
