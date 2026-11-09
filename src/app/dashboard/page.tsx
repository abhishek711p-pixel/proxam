import { redirect } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import Bar from "@/components/Bar";
import { Circled, Tick } from "@/components/Marks";
import McTicket from "@/components/masterclass/McTicket";
import McDate from "@/components/masterclass/McDate";
import { fmtMcDate, fmtMcTime, mcIsOver, seatsOf, upcomingFor } from "@/lib/masterclass";
import { CancelBooking, LogoutButton } from "./DashboardActions";
import { activeEnrollment } from "@/lib/batch";
import { currentUser } from "@/lib/auth";
import { getLang } from "@/lib/lang";
import { scopeFor, saveProgress } from "@/lib/store";
import { EXTRA_TEST_PRICE, FIELDS, FREE_ATTEMPTS, classLabel, totalQuestions } from "@/lib/config";
import { translator } from "@/lib/i18n";
import { attemptsLeft, attemptsUsed, finalizeFor } from "@/lib/testEngine";
import { buildLearnData } from "@/lib/learn";
import LearnApp from "./learn/LearnApp";
import "./learn.css";

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const [user, lang] = await Promise.all([currentUser(), getLang()]);
  if (!user) redirect("/login");
  if (!user.profile) redirect("/onboarding");
  await finalizeFor(user);
  const batchEnrollment = activeEnrollment(user);
  // Only this student's rows (tests, calls, doubts, plan), never the whole database.
  const db = await scopeFor([user.id], { notices: true, users: [user] });

  // Batch students get their learning space (roadmap, tests, doubts) instead of this page.
  if (batchEnrollment) {
    const tab = (await searchParams).tab;
    const initialTab = tab === "roadmap" || tab === "tests" || tab === "doubts" ? tab : "home";
    const data = buildLearnData(db, user, batchEnrollment, lang);
    // keep the admin's progress numbers fresh (one small write, only when something changed)
    const u = db.users[0];
    if (u && (u.progressPct !== data.prep.pct || u.behindSteps !== data.prep.overdueCount)) await saveProgress(user.id, data.prep.pct, data.prep.overdueCount, data.prep.lastDone);
    return <LearnApp data={data} initialTab={initialTab} />;
  }

  const t = translator(lang);
  const p = user.profile;
  const f = FIELDS[p.field];

  const attempts = db.attempts.filter((a) => a.userId === user.id).sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  const open = attempts.find((a) => a.status === "in_progress");
  const done = attempts.filter((a) => a.status === "submitted");
  const fresh = user;
  const left = attemptsLeft(user, db.attempts); // free or already paid for
  const usedAll = attemptsUsed(db.attempts);
  const booking = db.bookings.find((b) => b.userId === user.id && b.status === "booked");

  const enrolled = activeEnrollment(user);

  // Next action (PRD 7.10). After the result the student picks: free call or batch.
  let next: { title: string; desc?: string; href: string; cta: string } | null;
  if (open) next = { title: t("ns_resume_t"), desc: t("ns_resume_d"), href: `/test/${open.id}`, cta: t("resume_test") };
  else if (!done.length) next = { title: t("ns_test_t"), desc: `${f.label[lang]}, ${totalQuestions(f)} Q, ${f.durationMin} ${t("minutes")}`, href: "/test", cta: t("start_test") };
  else if (enrolled)
    next = {
      title: t("enrolled_title"),
      desc: `${t("joined_on")} ${new Date(enrolled.paidAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" })}. ${t("enrolled_next")}`,
      href: `/result/${done[0].id}`,
      cta: t("view_result"),
    };
  else if (booking) next = { title: t("ns_wait_t"), desc: fmt(booking.slotStart), href: `/result/${done[0].id}`, cta: t("view_result") };
  else next = { title: t("ns_call_t"), desc: t("ns_call_d"), href: "/book-call", cta: t("book_call") };

  // Analysis of the free tests: what is done, what is left.
  const used = Math.min(FREE_ATTEMPTS, usedAll); // free attempts used
  const paidTaken = Math.max(0, usedAll - FREE_ATTEMPTS);
  const latest = done[0]?.result;
  const first = done.length > 1 ? done[done.length - 1].result : undefined;
  const best = done.reduce((m, a) => Math.max(m, a.result!.percentage), 0);
  const change = latest && first ? Math.round(latest.percentage - first.percentage) : undefined;

  // Masterclass: the booked seat, or the one for this class to book
  const mySeat = seatsOf(db.masterclasses, fresh).find((x) => !mcIsOver(x.mc) && x.mc.status === "scheduled")?.mc;
  const mcOffer = mySeat ? undefined : upcomingFor(db.masterclasses, p).find((m) => !(fresh.masterclassSeats || []).some((s) => s.masterclassId === m.id));

  return (
    <>
      <Header active="dashboard" notices={db.notifications} />
      <main className="container-x py-6 md:py-10">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-slate-600">{t("hi_name")},</p>
            <h1 className="text-3xl md:text-4xl">{p.name}</h1>
          </div>
          <LogoutButton label={t("logout")} />
        </div>

        <div className="mt-6">
          <section className="rounded-xl bg-brand-800 p-5 text-white md:flex md:items-center md:justify-between md:gap-6 md:p-7">
              <div>
                <p className="text-sm font-semibold text-brand-200">{t("next_step")}</p>
                <h2 className="mt-1 text-2xl text-white">{next.title}</h2>
                {next.desc && <p className="mt-1 text-brand-100">{next.desc}</p>}
              </div>
              <Link href={next.href} className="btn-accent mt-4 w-full shrink-0 md:mt-0 md:w-auto">
                {next.cta}
              </Link>
            </section>
        </div>

        {mySeat ? (
          <section className="mt-4">
            <div className="mb-2 flex items-baseline justify-between gap-2">
              <h2 className="text-xl">{t("mc_your")}</h2>
              <Link href="/masterclass" className="text-sm font-semibold text-brand-700 underline underline-offset-4">
                {t("mc_open")}
              </Link>
            </div>
            <McTicket m={mySeat} lang={lang} mobile={user.mobile} compact />
          </section>
        ) : (
          mcOffer && (
            <Link href="/masterclass" className="mt-4 flex items-center gap-4 rounded-xl border border-accent-300 bg-white p-4 hover:border-accent-500">
              <McDate iso={mcOffer.startsAt} lang={lang} />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-accent-700">{t("mc_dash_offer")}, ₹{mcOffer.price}</span>
                <span className="block font-semibold text-brand-900">{mcOffer.title}</span>
                <span className="block text-sm text-slate-500">
                  {fmtMcDate(mcOffer.startsAt, lang)}, {fmtMcTime(mcOffer.startsAt)}
                </span>
              </span>
              <span className="hidden text-sm font-semibold text-brand-700 sm:block">{t("mc_see")}</span>
            </Link>
          )
        )}

        {booking && (
          <section className="card mt-4">
            <p className="text-sm font-semibold text-slate-500">{t("upcoming_call")}</p>
            <h2 className="mt-1 text-xl">
              {fmt(booking.slotStart)}, {booking.platform === "meet" ? "Google Meet" : "Zoom"}
            </h2>
            {booking.meetingLink ? (
              <>
                <div className="mt-4 grid gap-2 sm:flex">
                  <a href={booking.meetingLink} target="_blank" rel="noreferrer" className="btn-primary w-full sm:w-auto">
                    {t("join_call")}
                  </a>
                  <a
                    href={`https://wa.me/91${user.mobile}?text=${encodeURIComponent(
                      `*${t("wa_msg_title")}*\n${t("wa_msg_when")}: ${fmt(booking.slotStart)} (${booking.platform === "meet" ? "Google Meet" : "Zoom"})\n${t("wa_msg_join")}: ${booking.meetingLink}\n\n${t("wa_msg_early")}`,
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn w-full border border-[#25D366] bg-white text-[#0f6b5c] hover:bg-[#25D366]/10 sm:w-auto"
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-[#25D366]">
                      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.21h.01c5.46 0 9.91-4.45 9.91-9.91A9.85 9.85 0 0 0 12.04 2Zm5.8 14.03c-.24.68-1.42 1.3-1.95 1.35-.5.05-.97.23-3.27-.68-2.77-1.09-4.52-3.93-4.66-4.11-.13-.18-1.11-1.48-1.11-2.82 0-1.34.7-2 .95-2.27.25-.27.54-.34.72-.34h.52c.17 0 .39-.06.61.47.24.56.79 1.92.86 2.06.07.14.11.3.02.48-.09.18-.14.3-.27.46-.14.16-.29.36-.41.48-.14.14-.28.29-.12.56.16.27.71 1.17 1.52 1.9 1.05.93 1.93 1.22 2.2 1.36.27.14.43.11.59-.07.16-.18.68-.79.86-1.06.18-.27.36-.23.61-.14.25.09 1.58.75 1.85.88.27.14.45.2.52.32.07.11.07.66-.17 1.33Z" />
                    </svg>
                    {t("send_to_wa")}
                  </a>
                </div>
                <p className="mt-2 text-sm text-slate-600">{t("wa_self_note")}</p>
              </>
            ) : (
              <p className="mt-1 text-sm text-slate-600">{t("link_soon")}</p>
            )}
            <p className="mt-1 text-sm text-slate-600">{t("cal_reminder")}</p>
            <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-200 pt-4">
              <a href={`/api/bookings/${booking.id}/ics`} className="btn-ghost btn-sm">
                {t("add_to_calendar")}
              </a>
              <Link href="/book-call" className="btn-ghost btn-sm">
                {t("reschedule")}
              </Link>
              <CancelBooking id={booking.id} label={t("cancel")} confirmText={t("cancel_call_q")} />
            </div>
          </section>
        )}

        <div className="mt-4">
          {/* YOUR TESTS: done vs left, and how the scores moved */}
          <section className="card">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-2xl">{t("score_history")}</h2>
              <p className="text-sm text-slate-500">
                {f.label[lang]}, {classLabel(p.cls, lang)}, {p.board}
              </p>
            </div>

            {/* attempts: done and left */}
            <div className="mt-5 flex items-center gap-4 border-y border-slate-200 py-4">
              <div className="flex gap-1.5" aria-hidden>
                {Array.from({ length: FREE_ATTEMPTS }, (_, i) => (
                  <span
                    key={i}
                    className={`flex h-9 w-9 items-center justify-center rounded-md border ${i < used ? "border-brand-800 bg-brand-800 text-white" : "border-dashed border-slate-400"}`}
                  >
                    {i < used && <Tick className="h-5 w-5" />}
                  </span>
                ))}
              </div>
              <p className="leading-snug">
                <b className="font-display text-xl text-brand-900">
                  {used}/{FREE_ATTEMPTS}
                </b>{" "}
                {t("att_used")}
                <br />
                <span className="text-slate-600">
                  {used < FREE_ATTEMPTS ? `${FREE_ATTEMPTS - used} ${t("att_left_n")}` : left > 0 ? `${left} ${t("paid_test_ready")}` : t("next_test_49")}
                  {paidTaken > 0 && `, ${paidTaken} × ₹${EXTRA_TEST_PRICE}`}
                </span>
              </p>
            </div>

            {latest ? (
              <>
                <dl className={`grid divide-x divide-slate-200 py-4 ${change === undefined ? "grid-cols-2" : "grid-cols-3"}`}>
                  <div className="pr-3">
                    <dt className="text-sm text-slate-500">{t("latest_score")}</dt>
                    <dd className="font-display text-2xl font-bold text-brand-900">{Math.round(latest.percentage)}%</dd>
                    <dd className="text-sm text-slate-600">{latest.level}</dd>
                  </div>
                  <div className="px-3">
                    <dt className="text-sm text-slate-500">{t("best_score")}</dt>
                    <dd className="font-display text-2xl font-bold text-brand-900">{Math.round(best)}%</dd>
                  </div>
                  {change !== undefined && (
                    <div className="pl-3">
                      <dt className="text-sm text-slate-500">{t("change_first")}</dt>
                      <dd className={`font-display text-2xl font-bold ${change >= 0 ? "text-brand-700" : "text-accent-600"}`}>
                        {change > 0 ? "+" : ""}
                        {change}%
                      </dd>
                    </div>
                  )}
                </dl>

                <div className="border-t border-slate-200 pt-4">
                  <h3 className="text-base">{t("latest_subjects")}</h3>
                  <div className="mt-3 space-y-3">
                    {latest.subjects.map((x) => (
                      <Bar key={x.key} label={x.key} pct={x.pct} sub={`${x.correct}/${x.total}`} />
                    ))}
                  </div>
                  <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                    <p>
                      <b className="text-brand-800">{t("strong_areas")}:</b> {latest.strong.length ? latest.strong.join(", ") : t("none_yet")}
                    </p>
                    <p>
                      <b className="text-accent-700">{t("weak_areas")}:</b> {latest.weak.length ? latest.weak.join(", ") : t("none_yet")}
                    </p>
                  </div>
                </div>

                <div className="mt-5 border-t border-slate-200 pt-4">
                  <h3 className="text-base">{t("all_attempts")}</h3>
                  <ul className="mt-1">
                    {done.map((a) => (
                      <li key={a.id}>
                        <Link href={`/result/${a.id}`} className="flex items-center gap-3 border-b border-slate-200 py-3 hover:bg-slate-50">
                          <Circled className="hand w-[4.5rem] shrink-0 text-center text-xl leading-none">{Math.round(a.result!.percentage)}%</Circled>
                          <span className="min-w-0 flex-1">
                            <span className="block font-semibold text-brand-900">
                              {t("attempt")} {a.attemptNo}, {a.result!.level}
                            </span>
                            <span className="block truncate text-sm text-slate-500">{fmt(a.submittedAt!)}</span>
                          </span>
                          <span className="text-sm font-semibold text-brand-700">{t("view_result")}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            ) : (
              <p className="py-4 text-slate-600">{t("no_tests_yet")}</p>
            )}

            <div className="mt-4">
              {open ? (
                <Link href={`/test/${open.id}`} className="btn-primary w-full sm:w-auto">
                  {t("resume_test")}
                </Link>
              ) : left > 0 ? (
                <Link href="/test" className={`${done.length ? "btn-ghost" : "btn-primary"} w-full sm:w-auto`}>
                  {done.length ? t("retake") : t("start_test")}
                </Link>
              ) : (
                <div>
                  <p className="text-sm text-slate-600">{t("att_none_left")}</p>
                  <Link href="/test" className="btn-accent mt-3 w-full sm:w-auto">
                    {t("extra_test_t")}
                  </Link>
                </div>
              )}
            </div>
          </section>

        </div>

      </main>
    </>
  );
}
