import Link from "next/link";
import Header from "@/components/Header";
import { Tick } from "@/components/Marks";
import Pricing, { BatchCard } from "@/components/Pricing";
import { BATCH_FEATURES, batchTitle } from "@/lib/batchCopy";
import JoinButton from "./JoinButton";
import { pageUser } from "@/lib/pageUser";
import { getLang } from "@/lib/lang";
import { userAttempts } from "@/lib/store";
import { CLASSES, FIELDS, classLabel, type ClassLevel, type FieldId } from "@/lib/config";
import { batchLabel, batchOfEnrollment, batchOptions, batchPrice, hasTracks, isTrack, isValidBatch, type BatchField } from "@/lib/batches";
import { translator, type Key } from "@/lib/i18n";
import { activeEnrollment, demoPayments } from "@/lib/batch";

export const metadata = {
  title: "Online Batches for Class 10, 11, 12 and Droppers (JEE, NEET, CUET)",
  description: "Personal week-by-week roadmap, prescribed videos and DPPs, a test every 2 weeks and doubt support. Batches for Science and Commerce from ₹299.",
  alternates: { canonical: "/batch" },
};

export default async function BatchPage({ searchParams }: { searchParams: Promise<{ cls?: string; field?: string }> }) {
  const [user, lang, sp] = await Promise.all([pageUser(), getLang(), searchParams]);
  const t = translator(lang);
  const enrolled = user ? activeEnrollment(user) : undefined;
  const hasResult = user ? (await userAttempts(user.id)).some((a) => a.status === "submitted") : false;
  const fmt = (s: string) => new Date(s).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });

  // Which batch? A logged-in student gets a batch for their own class and field.
  // Class 12 Science has four (JEE, NEET, Boards PCM, Boards PCB): the student picks one of those that fit.
  const p = user?.profile;
  const qCls = CLASSES.includes(sp.cls as ClassLevel) ? (sp.cls as ClassLevel) : undefined;
  let qField = sp.field as BatchField | undefined;
  // old links like ?cls=12&field=pcm go to the first matching Class 12 batch
  if (qCls && qField && !isTrack(qField) && qField in FIELDS && hasTracks(qCls, qField as FieldId)) qField = batchOptions(qCls, qField as FieldId)[0];
  const options: BatchField[] = p ? batchOptions(p.cls, p.field) : [];
  const sel: { cls: ClassLevel; field: BatchField } | undefined = p
    ? { cls: p.cls, field: qField && options.includes(qField) ? qField : options[0] }
    : qCls && qField && isValidBatch(qCls, qField)
      ? { cls: qCls, field: qField }
      : undefined;
  const locked = Boolean(p);

  const whys: [Key, Key][] = [
    ["bw_1_t", "bw_1_d"],
    ["bw_2_t", "bw_2_d"],
    ["bw_3_t", "bw_3_d"],
    ["bw_4_t", "bw_4_d"],
  ];
  const faqs: [Key, Key][] = [
    ["test_first_q", "test_first_a"],
    ["renew_q", "renew_a"],
    ["refund_q", "refund_a"],
    ["faq_4_q", "faq_4_a"],
  ];

  const self = sel ? `/batch?cls=${sel.cls}&field=${sel.field}` : "/batch";
  const action = !user
    ? { kind: "link" as const, href: `/login?next=${encodeURIComponent(self)}`, label: t("login_to_join") }
    : !user.profile
      ? { kind: "link" as const, href: `/onboarding?next=${encodeURIComponent(self)}`, label: t("login_to_join") }
      : { kind: "pay" as const };
  const price = sel ? batchPrice(sel.cls, sel.field) : 0;
  const enrolledBatch = enrolled ? batchOfEnrollment(enrolled, user!) : undefined;

  const enrolledCard = enrolled && (
    <div className="rounded-xl bg-brand-800 p-6 text-white">
      <h2 className="text-2xl text-white">{t("enrolled_title")}</h2>
      <p className="mt-1 text-brand-50">
        {enrolledBatch ? `${batchLabel(enrolledBatch.cls, enrolledBatch.field, lang)}. ` : ""}
        {t("joined_on")} {fmt(enrolled.paidAt)}
      </p>
      <p className="mt-3 text-brand-50">{hasResult ? t("enrolled_next") : t("enrolled_no_test")}</p>
      <Link href={hasResult ? "/dashboard" : "/test"} className="btn mt-5 w-full bg-white text-brand-800">
        {hasResult ? t("go_dashboard") : t("start_test")}
      </Link>
      {enrolled.mode === "demo" && <p className="mt-3 text-xs text-brand-100">{t("demo_pay")}</p>}
    </div>
  );

  const checkout = sel && (
    <div className="space-y-3">
      <BatchCard cls={sel.cls} field={sel.field} lang={lang} dark mine={locked} showCta={false} features={false} />
      <div className="card">
        {action.kind === "link" ? (
          <Link href={action.href} className="btn-primary w-full text-lg">
            {action.label}, ₹{price}
          </Link>
        ) : (
          <JoinButton lang={lang} demo={demoPayments()} price={price} batch={sel.field} />
        )}
        <p className="mt-3 text-center text-xs text-slate-500">{t("pay_methods")}</p>
        <p className="mt-1 text-center text-xs text-slate-500">{t("batch_terms")}</p>
        {!locked && (
          <p className="mt-3 text-center">
            <Link href="/batch#choose" className="text-sm font-semibold text-brand-700 underline underline-offset-4">
              {t("choose_field")}
            </Link>
          </p>
        )}
      </div>
    </div>
  );

  return (
    <>
      <Header active="batch" />
      <main className={sel && !enrolled ? "pb-28 md:pb-0" : ""}>
        <section className="border-b border-slate-300 bg-brand-50">
          <div className="container-x py-8 md:py-12">
            <h1 className="max-w-3xl text-[2.2rem] md:text-5xl">{t("plan_batch_note")}</h1>
            <p className="mt-3 max-w-3xl text-slate-600 md:text-lg">{t("batch_desc_long")}</p>
            {p && !enrolled && (
              <p className="mt-5 inline-block rounded-md border-l-4 border-accent-500 bg-white px-4 py-3 text-brand-900">
                {t("batch_profile_note")} <b>{classLabel(p.cls, lang)}, {FIELDS[p.field].label[lang]}</b>. {t("batch_profile_change")}
              </p>
            )}
            {p && !enrolled && options.length > 1 && sel && (
              <div className="mt-5">
                <p className="mb-2 text-sm font-semibold text-brand-900">{t("choose_batch")}</p>
                <div className="flex flex-wrap gap-2">
                  {options.map((o) => (
                    <Link
                      key={o}
                      href={`/batch?cls=${p.cls}&field=${o}`}
                      scroll={false}
                      aria-current={sel.field === o ? "true" : undefined}
                      className={`min-h-11 rounded-md border px-4 py-2 text-sm font-semibold ${
                        sel.field === o ? "border-brand-800 bg-brand-800 text-white" : "border-slate-400 bg-white text-brand-900 hover:border-brand-800"
                      }`}
                    >
                      {batchLabel(p.cls, o, lang)} <span className="font-normal opacity-80">₹{batchPrice(p.cls, o)}</span>
                    </Link>
                  ))}
                </div>
                <p className="mt-2 text-sm text-slate-600">{t("track_help")}</p>
              </div>
            )}

            {enrolled ? (
              <div className="mt-6 max-w-md">{enrolledCard}</div>
            ) : sel ? (
              <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_420px] lg:items-start lg:gap-10">
                <div className="lg:order-2 lg:sticky lg:top-24">{checkout}</div>
                <div className="lg:order-1">
                  <h2 className="text-2xl md:text-3xl">{t("whats_included")}</h2>
                  <ul className="mt-4 grid gap-x-8 md:grid-cols-2">
                    {BATCH_FEATURES.map((k) => (
                      <li key={k} className="flex items-start gap-3 border-b border-slate-300 py-3">
                        <Tick className="mt-0.5 h-6 w-6 shrink-0 text-accent-500" />
                        <span>{t(k)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <div id="choose" className="mt-6 scroll-mt-20">
                <h2 className="mb-5 text-2xl md:text-3xl">{t("pricing_title")}</h2>
                <Pricing lang={lang} freeHref={user ? "/test" : "/login?next=/test"} />
              </div>
            )}
          </div>
        </section>

        {sel && !locked && !enrolled && (
          <section id="choose" className="container-x scroll-mt-20 py-10">
            <h2 className="mb-5 text-2xl md:text-3xl">{t("pricing_title")}</h2>
            <Pricing lang={lang} freeHref={user ? "/test" : "/login?next=/test"} initial={{ cls: sel.cls, field: sel.field, stream: isTrack(sel.field) ? "science" : FIELDS[sel.field].stream }} />
          </section>
        )}

        <section className="container-x py-10">
          <h2 className="text-2xl md:text-3xl">{t("batch_why_title")}</h2>
          <div className="mt-6 grid gap-x-12 md:grid-cols-2">
            {whys.map(([title, desc]) => (
              <div key={title} className="border-t border-slate-300 py-5">
                <h3 className="text-xl">{t(title)}</h3>
                <p className="mt-2 max-w-md text-slate-600">{t(desc)}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="container-x pb-12">
          <div className="max-w-3xl">
            <h2 className="text-2xl md:text-3xl">{t("faq_title")}</h2>
            <div className="mt-4 border-t border-slate-300">
              {faqs.map(([q, a]) => (
                <details key={q} className="group border-b border-slate-300">
                  <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-3 text-lg font-semibold text-brand-900">
                    {t(q)}
                    <span className="text-2xl font-normal leading-none text-accent-500 transition-transform group-open:rotate-45" aria-hidden>+</span>
                  </summary>
                  <p className="pb-4 text-slate-600">{t(a)}</p>
                </details>
              ))}
            </div>
            <p className="mt-4 text-xs text-slate-500">{t("no_guarantee")}</p>
          </div>
        </section>

        {/* mobile sticky buy bar */}
        {sel && !enrolled && (
          <div className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:hidden">
            <div className="flex items-center gap-3">
              <div className="min-w-0 shrink-0">
                <p className="font-display text-2xl font-bold leading-none text-brand-900">₹{price}</p>
                <p className="truncate text-xs text-slate-500">{batchLabel(sel.cls, sel.field, lang)}</p>
              </div>
              {action.kind === "link" ? (
                <Link href={action.href} className="btn-primary flex-1">
                  {action.label}
                </Link>
              ) : (
                <div className="flex-1">
                  <JoinButton lang={lang} demo={demoPayments()} price={price} batch={sel!.field} compact />
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </>
  );
}
