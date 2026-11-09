import { batchOptions, batchPrice } from "@/lib/batches";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import Bar from "@/components/Bar";
import ResultActions from "./ResultActions";
import ChooseNext from "@/components/ChooseNext";
import { Circled } from "@/components/Marks";
import { activeEnrollment } from "@/lib/batch";
import { pageUser } from "@/lib/pageUser";
import { getLang } from "@/lib/lang";
import { getAttempt, userBookings } from "@/lib/store";
import { BRAND, FIELDS, INTERESTS, PART_LABEL, priceFor, type InterestTag, type Part } from "@/lib/config";
import { translator } from "@/lib/i18n";
import { finalizeFor } from "@/lib/testEngine";

const LEVEL_STYLE: Record<string, string> = {
  Beginner: "bg-accent-100 text-accent-700",
  Developing: "bg-accent-100 text-accent-800",
  Strong: "bg-brand-100 text-brand-700",
  Advanced: "bg-brand-100 text-brand-700",
};

export default async function ResultPage({ params }: { params: Promise<{ id: string }> }) {
  const [user, lang, { id }] = await Promise.all([pageUser(), getLang(), params]);
  if (!user) redirect("/login");
  await finalizeFor(user);
  const [attempt, bookings] = await Promise.all([getAttempt(id), userBookings(user.id)]);
  if (!attempt || attempt.userId !== user.id) notFound();
  if (attempt.status !== "submitted" || !attempt.result) redirect(`/test/${attempt.id}`);

  const t = translator(lang);
  const r = attempt.result;
  const f = FIELDS[attempt.field];
  const hasBooking = bookings.some((b) => b.status === "booked");
  const cls = user.profile?.cls || attempt.cls;
  const opts = user.profile ? batchOptions(user.profile.cls, user.profile.field) : []; // Class 12 Science: four batches
  const interestTotal = Object.values(r.interests).reduce((a, b) => a + (b || 0), 0);
  const shareText = `I scored ${r.percentage}% (${r.level}) on the ${BRAND} ${f.label.en} test.`;

  return (
    <>
      <Header />
      <main className="container-x py-6 md:py-10">
        <div className="mx-auto max-w-5xl space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-brand-600">
                {f.label[lang]}, {attempt.checkpointNo ? `Checkpoint ${String(attempt.checkpointNo).padStart(2, "0")}` : `${t("attempt")} ${attempt.attemptNo}`}
              </p>
              <h1 className="mt-1 text-3xl md:text-4xl">{t("your_result")}</h1>
              <p className="text-sm text-slate-500">
                {user.profile?.name}, {new Date(attempt.submittedAt!).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" })}
              </p>
            </div>
          </div>

          {attempt.autoSubmitted && <p className="rounded-md border border-accent-200 bg-accent-50 px-4 py-3 text-sm text-accent-800">{t("auto_submitted")}</p>}

          <div className="grid gap-4 lg:grid-cols-3">
            {/* headline */}
            <section className="card lg:col-span-1">
              <div className="flex items-center justify-between">
                <h2 className="text-lg">{t("score")}</h2>
                <span className={`pill ${LEVEL_STYLE[r.level]}`}>
                  {t("level")}: {r.level}
                </span>
              </div>
              <p className="mt-3"><Circled className="hand text-6xl leading-none">{Math.round(r.percentage)}%</Circled></p>
              <p className="mt-1 text-slate-600">
                {r.correct} / {r.scoredTotal}
              </p>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center text-sm">
                <div className="rounded-md border border-brand-200 bg-brand-50 p-2">
                  <p className="text-lg font-bold text-brand-700">{r.correct}</p>
                  <p className="text-xs text-slate-600">{t("correct")}</p>
                </div>
                <div className="rounded-md border border-accent-200 bg-accent-50 p-2">
                  <p className="text-lg font-bold text-accent-700">{r.wrong}</p>
                  <p className="text-xs text-slate-600">{t("wrong")}</p>
                </div>
                <div className="rounded-md border border-slate-300 bg-slate-50 p-2">
                  <p className="text-lg font-bold">{r.unanswered}</p>
                  <p className="text-xs text-slate-600">{t("skipped")}</p>
                </div>
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 text-sm">
                <div>
                  <dt className="text-slate-500">{t("accuracy")}</dt>
                  <dd className="text-lg font-bold">{Math.round(r.accuracy)}%</dd>
                </div>
                <div>
                  <dt className="text-slate-500">{t("time_per_q")}</dt>
                  <dd className="text-lg font-bold">{r.avgTimeSec}s</dd>
                </div>
              </dl>
            </section>

            {/* subjects */}
            <section className="card space-y-4 lg:col-span-2">
              <h2 className="text-lg">{t("by_subject")}</h2>
              {r.subjects.map((s) => (
                <Bar key={s.key} label={s.key} pct={s.pct} sub={`${s.correct}/${s.total}`} />
              ))}
              <div className="border-t border-slate-100 pt-4">
                <p className="mb-3 text-sm font-semibold text-slate-600">{t("by_section")}</p>
                <div className="grid gap-3 md:grid-cols-2">
                  {r.parts.map((p) => (
                    <Bar key={p.key} label={`Part ${p.key}: ${PART_LABEL[p.key as Part][lang]}`} pct={p.pct} />
                  ))}
                </div>
              </div>
            </section>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <section className="card">
              <h2 className="text-lg text-brand-800">{t("strong_areas")}</h2>
              <p className="mt-2 text-slate-700">{r.strong.length ? r.strong.join(", ") : t("none_yet")}</p>
              <h2 className="mt-4 text-lg text-accent-700">{t("weak_areas")}</h2>
              <p className="mt-2 text-slate-700">{r.weak.length ? r.weak.join(", ") : t("none_yet")}</p>
            </section>
            <section className="card">
              <h2 className="text-lg">{t("weak_topics")}</h2>
              {r.weakTopics.length ? (
                <ul className="mt-2 space-y-1 text-sm text-slate-700">
                  {r.weakTopics.map((x) => (
                    <li key={x} className="border-b border-slate-200 py-1.5 last:border-0">{x}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-slate-700">{t("none_yet")}</p>
              )}
            </section>
          </div>

          {(interestTotal > 0 || r.streamRecommendation) && (
            <section className="card">
              {r.streamRecommendation && (
                <div className="mb-4 rounded-md border-l-4 border-brand-700 bg-brand-50 p-4">
                  <p className="text-sm font-semibold text-brand-700">{t("stream_reco")}</p>
                  <p className="mt-1 text-xl font-bold text-brand-900">{r.streamRecommendation}</p>
                  <p className="mt-1 text-xs text-slate-600">{t("stream_reco_note")}</p>
                </div>
              )}
              {interestTotal > 0 && (
                <>
                  <h2 className="text-lg">{t("career_lean")}</h2>
                  <div className="mt-3 space-y-3">
                    {(Object.entries(r.interests) as [InterestTag, number][])
                      .sort((a, b) => b[1] - a[1])
                      .map(([tag, n]) => (
                        <Bar key={tag} label={INTERESTS[tag][lang]} pct={(n / interestTotal) * 100} neutral />
                      ))}
                  </div>
                </>
              )}
            </section>
          )}

          {/* Two options after the result: free call (optional) or join the batch directly */}
          <ChooseNext lang={lang} hasBooking={hasBooking} enrolled={Boolean(activeEnrollment(user))} price={opts.length ? Math.min(...opts.map((f) => batchPrice(cls, f))) : priceFor(cls)} from={opts.length > 1} />

          <ResultActions lang={lang} shareText={shareText} />
          <div className="no-print text-center">
            <Link href="/dashboard" className="text-sm font-semibold text-brand-700 underline underline-offset-4">
              {t("dashboard")}
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
