import Link from "next/link";
import PublicHeader from "@/components/PublicHeader";
import { BRAND, FIELDS, totalQuestions } from "@/lib/config";
import { translator, type Key } from "@/lib/i18n";
import Pricing from "@/components/Pricing";
import { Circled, Cross, Tick } from "@/components/Marks";
import type { Lang } from "@/lib/types";
import { GUIDES } from "@/lib/guides";
import { ORG_LD, WEBSITE_LD, jsonLd } from "@/lib/site";


// Sample answer sheet in the hero (a PCM student who picked Maths as favourite): [subject, marks, out of].
const SAMPLE: [string, number, number][] = [
  ["Physics", 8, 10],
  ["Chemistry", 9, 10],
  ["Mathematics", 6, 15],
];

/** The home page. Static: built once for English (/) and once for Hindi (/hi), served from the CDN. */
export default function Landing({ lang }: { lang: Lang }) {
  const t = translator(lang);
  // Logged-in students are sent straight on to /test by the login page.
  const ctaHref = "/login?next=/test";

  const steps: [Key, Key][] = [
    ["how_1_t", "how_1_d"],
    ["how_2_t", "how_2_d"],
    ["how_3_t", "how_3_d"],
    ["how_4_t", "how_4_d"],
  ];
  const gets: Key[] = ["get_1", "get_2", "get_3", "get_4", "get_5", "get_6"];
  const faqs: [Key, Key][] = [
    ["faq_1_q", "faq_1_a"],
    ["faq_2_q", "faq_2_a"],
    ["test_first_q", "test_first_a"],
    ["renew_q", "renew_a"],
    ["faq_4_q", "faq_4_a"],
  ];
  const whys: [Key, Key][] = [
    ["bw_1_t", "bw_1_d"],
    ["bw_2_t", "bw_2_d"],
    ["bw_3_t", "bw_3_d"],
    ["bw_4_t", "bw_4_d"],
  ];
  const fieldGroups: [string, (typeof FIELDS)[keyof typeof FIELDS][]][] = [
    [t("science"), Object.values(FIELDS).filter((f) => f.stream === "science")],
    [t("commerce"), Object.values(FIELDS).filter((f) => f.stream === "commerce")],
    [t("tab_10"), Object.values(FIELDS).filter((f) => f.classes.length === 1)],
  ];
  const total = SAMPLE.reduce((a, [, m]) => a + m, 0);
  const outOf = SAMPLE.reduce((a, [, , o]) => a + o, 0);
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    inLanguage: lang === "hi" ? "hi-IN" : "en-IN",
    mainEntity: faqs.map(([q, a]) => ({ "@type": "Question", name: t(q), acceptedAnswer: { "@type": "Answer", text: t(a) } })),
  };

  return (
    <>
      <PublicHeader lang={lang} altHref={lang === "hi" ? "/" : "/hi"} />
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd([ORG_LD, WEBSITE_LD, faqLd])} />

      {/* HERO: the headline, and a checked answer sheet */}
      <section className="container-x grid gap-10 pb-14 pt-8 md:pt-12 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:gap-16 lg:pb-24 lg:pt-16">
        <div>
          <p className="font-semibold text-brand-700">{t("hero_tag")}</p>
          <h1 className="mt-3 text-[2.4rem] md:text-5xl lg:text-[3.6rem]">{t("hero_title")}</h1>
          <p className="mt-5 max-w-xl text-lg text-slate-700">{t("hero_sub")}</p>
          <div className="mt-7 grid gap-3 sm:flex">
            <Link href={ctaHref} className="btn-accent w-full text-lg sm:w-auto sm:px-7">
              {t("cta_test")}
            </Link>
            <a href="#batch" className="btn-ghost w-full sm:w-auto">
              {t("see_batch")}
            </a>
          </div>
          <p className="mt-4 text-sm text-slate-600">{t("hero_facts")}</p>
          <Link href="/masterclass" className="mt-5 inline-flex items-center gap-2 rounded-md border border-accent-300 bg-white px-3 py-2 text-sm font-semibold text-accent-700 hover:border-accent-500">
            <span className="h-2 w-2 rounded-full bg-accent-500" aria-hidden />
            {t("mc_hero_link")}
          </Link>
        </div>

        <figure className="relative mx-auto w-full max-w-md lg:mr-0">
          {/* tape */}
          <span className="absolute -top-3 left-1/2 z-10 h-7 w-28 -translate-x-1/2 rotate-[-3deg] bg-brand-200/80" aria-hidden />
          <div
            className="sheet ruled relative overflow-hidden px-6 pb-6 pl-14 pt-8 shadow-[0_18px_40px_-24px_rgba(42,54,34,0.45)] md:rotate-[1.2deg]"
            aria-hidden
          >
            {/* margin line */}
            <span className="absolute inset-y-0 left-10 w-px bg-accent-500/40" />
            <p className="text-sm font-semibold text-slate-500">{t("paper_head")}</p>
            <p className="font-display text-lg font-bold leading-8 text-brand-900">{t("paper_name")}</p>

            <ul className="mt-2">
              {SAMPLE.map(([subject, m, o]) => (
                <li key={subject} className="flex h-8 items-center justify-between gap-3">
                  <span className="text-slate-800">{subject}</span>
                  <span className="flex items-center gap-2 tabular-nums text-slate-600">
                    {m}/{o}
                    {m * 2 >= o ? <Tick className="h-6 w-6 text-accent-500" /> : <Cross className="h-5 w-5 text-accent-500" />}
                  </span>
                </li>
              ))}
              <li className="flex h-8 items-center justify-between border-t border-slate-400/60 font-semibold">
                <span>{t("paper_total")}</span>
                <span className="tabular-nums">
                  {total}/{outOf}
                </span>
              </li>
            </ul>

            <div className="mt-5 flex items-center gap-4">
              <Circled className="hand shrink-0 text-4xl leading-none">{Math.round((total / outOf) * 100)}%</Circled>
              <p className="hand rotate-[-2deg] text-lg leading-snug">{t("paper_note")}</p>
            </div>
          </div>
          <figcaption className="mt-4 text-center text-sm text-slate-500">{t("paper_cap")}</figcaption>
        </figure>
      </section>

      <main>
        {/* MASTERCLASS: only a teaser here; the details live on /masterclass */}
        <section id="masterclass" className="bg-brand-800 text-white">
          <div className="container-x grid items-center gap-8 py-12 md:grid-cols-[1fr_auto] md:gap-16 md:py-16">
            <div>
              <h2 className="max-w-2xl text-3xl text-white md:text-[2.6rem]">{t("mc_teaser_t")}</h2>
              <p className="mt-3 max-w-xl text-brand-100 md:text-lg">{t("mc_teaser_d2")}</p>
              <Link href="/masterclass" className="btn-accent mt-6 w-full text-lg sm:w-auto sm:px-7">
                {t("mc_teaser_cta")}
              </Link>
            </div>
            <div className="hidden text-center md:block" aria-hidden>
              <Circled className="font-hand text-8xl font-bold leading-none text-accent-300">₹1</Circled>
              <p className="mt-2 text-brand-200">{t("mc_teaser_price")}</p>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS: a real sequence, so it is numbered */}
        <section className="border-t border-slate-300 py-12 md:py-16">
          <div className="container-x">
            <h2 className="text-3xl md:text-4xl">{t("how_title")}</h2>
            <ol className="mt-8 grid gap-0 md:grid-cols-2 md:gap-x-10 lg:grid-cols-4">
              {steps.map(([title, desc], i) => (
                <li key={title} className="relative flex gap-4 pb-8 lg:block lg:pb-0">
                  {/* connecting line on mobile */}
                  {i < steps.length - 1 && <span className="absolute bottom-0 left-[15px] top-10 w-px bg-slate-300 md:hidden" aria-hidden />}
                  <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-brand-800 bg-slate-50 font-display text-sm font-bold text-brand-800">
                    {i + 1}
                  </span>
                  <div className="lg:mt-4">
                    <h3 className="text-lg">{t(title)}</h3>
                    <p className="mt-1 text-slate-600">{t(desc)}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* FIELDS: read like a timetable, not a card grid */}
        <section className="border-t border-slate-300 bg-white py-12 md:py-16">
          <div className="container-x grid gap-8 lg:grid-cols-[1fr_2fr] lg:gap-16">
            <div>
              <h2 className="text-3xl md:text-4xl">{t("fields_title")}</h2>
              <p className="mt-3 text-slate-600">{t("fields_sub")}</p>
            </div>
            <div className="space-y-8">
              {fieldGroups.map(([group, fields]) => (
                <div key={group}>
                  <h3 className="border-b-2 border-brand-800 pb-2 text-base">{group}</h3>
                  <ul>
                    {fields.map((f) => (
                      <li key={f.id} className="grid gap-1 border-b border-slate-300 py-3 md:grid-cols-[13rem_1fr_auto] md:gap-6">
                        <span className="font-semibold text-brand-900">{f.label[lang]}</span>
                        <span className="text-slate-600">{f.goals}</span>
                        <span className="text-sm text-slate-500 md:text-right">
                          {totalQuestions(f)} Q, {f.durationMin} {t("minutes")}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* WHAT THE RESULT SHOWS */}
        <section className="border-t border-slate-300 py-12 md:py-16">
          <div className="container-x grid gap-8 lg:grid-cols-[1fr_2fr] lg:gap-16">
            <div>
              <h2 className="text-3xl md:text-4xl">{t("get_title")}</h2>
              <p className="mt-3 text-slate-600">{t("get_sub")}</p>
            </div>
            <ul className="grid gap-x-10 sm:grid-cols-2">
              {gets.map((g) => (
                <li key={g} className="flex items-start gap-3 border-b border-slate-300 py-3">
                  <Tick className="mt-0.5 h-6 w-6 shrink-0 text-accent-500" />
                  <span>{t(g)}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* PRICES: sell the batch */}
        <section id="batch" className="scroll-mt-16 border-t border-slate-300 bg-brand-50 py-12 md:py-20">
          <div className="container-x">
            <div className="max-w-2xl">
              <h2 className="text-3xl md:text-[2.6rem]">{t("pricing_title")}</h2>
              <p className="mt-3 text-slate-700 md:text-lg">{t("pricing_sub")}</p>
            </div>
            <div className="mt-8">
              <Pricing lang={lang} freeHref={ctaHref} />
            </div>
            <p className="mt-6 text-sm text-slate-600">{t("no_guarantee")}</p>
          </div>
        </section>

        {/* WHY THE BATCH */}
        <section className="border-t border-slate-300 py-12 md:py-16">
          <div className="container-x">
            <h2 className="max-w-xl text-3xl md:text-4xl">{t("batch_why_title")}</h2>
            <div className="mt-8 grid gap-x-12 md:grid-cols-2">
              {whys.map(([title, desc]) => (
                <div key={title} className="border-t border-slate-300 py-5">
                  <h3 className="text-xl">{t(title)}</h3>
                  <p className="mt-2 max-w-md text-slate-600">{t(desc)}</p>
                </div>
              ))}
            </div>
            <div className="mt-6 grid gap-3 sm:flex">
              <a href="#batch" className="btn-primary w-full sm:w-auto">
                {t("see_batch")}
              </a>
              <Link href={ctaHref} className="btn-ghost w-full sm:w-auto">
                {t("start_free")}
              </Link>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="border-t border-slate-300 bg-white py-12 md:py-16">
          <div className="container-x grid gap-8 lg:grid-cols-[1fr_2fr] lg:gap-16">
            <h2 className="text-3xl md:text-4xl">{t("faq_title")}</h2>
            <div>
              <div className="border-t border-slate-300">
                {faqs.map(([q, a]) => (
                  <details key={q} className="group border-b border-slate-300">
                    <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-3 text-lg font-semibold text-brand-900">
                      {t(q)}
                      <span className="text-2xl font-normal leading-none text-accent-500 transition-transform group-open:rotate-45" aria-hidden>
                        +
                      </span>
                    </summary>
                    <p className="max-w-2xl pb-4 text-slate-600">{t(a)}</p>
                  </details>
                ))}
              </div>
              <Link href={ctaHref} className="btn-accent mt-8 w-full md:w-auto md:px-7">
                {t("cta_test")}
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-300 py-8 text-sm text-slate-500">
        <div className="container-x space-y-4">
          <nav aria-label={lang === "hi" ? "फ्री टेस्ट गाइड" : "Free test guides"} className="flex flex-wrap gap-x-5 gap-y-2">
            {GUIDES.map((g) => (
              <Link key={g.slug} href={`/${g.slug}`} className="hover:text-brand-900">
                {g.navLabel}
              </Link>
            ))}
          </nav>
          <div className="flex flex-col gap-2 md:flex-row md:justify-between">
            <p>
              © {new Date().getFullYear()} {BRAND}
            </p>
            <Link href="/privacy" className="hover:text-brand-900">
              {t("privacy")}
            </Link>
          </div>
        </div>
      </footer>
    </>
  );
}

