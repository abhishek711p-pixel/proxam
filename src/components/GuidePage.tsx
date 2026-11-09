import Link from "next/link";
import type { Metadata } from "next";
import PublicHeader from "./PublicHeader";
import { Tick } from "./Marks";
import { BRAND, FIELDS, testSubjectLabel, totalQuestions } from "@/lib/config";
import { GUIDES, guideBySlug, type Guide } from "@/lib/guides";
import { SUBJECT_NAME, chaptersFor, subjectsFor } from "@/lib/syllabus";
import { ORG_LD, SITE_URL, jsonLd } from "@/lib/site";

export function guideMetadata(slug: string): Metadata {
  const g = guideBySlug(slug)!;
  return {
    title: { absolute: `${g.title} | ${BRAND}` },
    description: g.description,
    alternates: { canonical: `/${g.slug}` },
    openGraph: { type: "article", url: `/${g.slug}`, title: g.title, description: g.description },
    twitter: { title: g.title, description: g.description },
  };
}

/** A search landing page: test pattern, syllabus, result, who it is for, FAQs, and a clear start button. */
export default function GuidePage({ slug }: { slug: string }) {
  const g = guideBySlug(slug) as Guide;
  const cta = "/login?next=/test";
  const others = GUIDES.filter((x) => x.slug !== g.slug);
  // Syllabus: the field's subjects, chapters for the guide's class levels (Class 12 for a two-level guide shows both)
  const field = g.fields[0];
  const cls = g.levels.includes("10") ? "10" : "dropper";
  const syllabus = chaptersFor(cls, field);
  const url = `${SITE_URL}/${g.slug}`;

  const ld = [
    ORG_LD,
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: BRAND, item: SITE_URL },
        { "@type": "ListItem", position: 2, name: g.navLabel, item: url },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: g.faqs.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
    },
  ];

  return (
    <>
      <PublicHeader lang="en" />
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(ld)} />
      <main className="container-x py-8 md:py-12">
        <article className="mx-auto max-w-3xl">
          <nav aria-label="Breadcrumb" className="text-sm text-slate-500">
            <Link href="/" className="hover:text-brand-900">
              {BRAND}
            </Link>
            <span aria-hidden> / </span>
            <span>{g.navLabel}</span>
          </nav>
          <h1 className="mt-3 text-[2.1rem] leading-tight md:text-5xl">{g.h1}</h1>
          {g.intro.map((p) => (
            <p key={p.slice(0, 20)} className="mt-4 text-lg text-slate-700">
              {p}
            </p>
          ))}
          <div className="mt-6 grid gap-3 sm:flex">
            <Link href={cta} className="btn-accent w-full text-lg sm:w-auto sm:px-7">
              Start the free test
            </Link>
            <Link href="/batch" className="btn-ghost w-full sm:w-auto">
              See batches
            </Link>
          </div>

          <h2 className="mt-12 text-2xl md:text-3xl">Test pattern</h2>
          {g.fields.map((id) => {
            const f = FIELDS[id];
            return (
              <div key={id} className="card mt-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-300 pb-2">
                  <h3 className="text-lg">{f.label.en}</h3>
                  <span className="text-sm font-semibold text-brand-800">
                    {totalQuestions(f)} questions, {f.durationMin} minutes
                  </span>
                </div>
                <table className="mt-2 w-full text-sm">
                  <thead className="sr-only">
                    <tr>
                      <th>Subject</th>
                      <th>Questions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {f.sections.map((s) => (
                      <tr key={s.subject} className="border-b border-slate-200 last:border-0">
                        <td className="py-2">{testSubjectLabel(s.subject, "en")}</td>
                        <td className="py-2 text-right font-semibold">
                          {f.favourite && s.part === "A" ? `${f.favourite.others} or ${f.favourite.count}` : s.count}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {f.favourite && (
                  <p className="mt-2 text-sm text-slate-600">
                    You pick a favourite subject before starting: it gets {f.favourite.count} questions, the other two get {f.favourite.others} each.
                  </p>
                )}
              </div>
            );
          })}
          <p className="mt-3 text-sm text-slate-600">All questions are MCQs with one correct answer. No negative marking. Answers save after every tap.</p>

          <h2 className="mt-12 text-2xl md:text-3xl">What your result shows</h2>
          <ul className="mt-4 grid gap-x-8 sm:grid-cols-2">
            {[
              "Total score and percentage",
              "Subject-wise and topic-wise marks",
              "Accuracy and time per question",
              "Your strong and weak topics",
              "Your level, from Beginner to Advanced",
              cls === "10" ? "A suggested stream for Class 11" : "A realistic next step and target",
            ].map((x) => (
              <li key={x} className="flex items-start gap-3 border-b border-slate-300 py-3">
                <Tick className="mt-0.5 h-6 w-6 shrink-0 text-accent-500" />
                <span>{x}</span>
              </li>
            ))}
          </ul>

          <h2 className="mt-12 text-2xl md:text-3xl">Who should take it</h2>
          <ul className="mt-4 list-disc space-y-2 pl-6 text-slate-700">
            {g.forWho.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
          <p className="mt-4 rounded-lg border border-accent-300 bg-white px-4 py-3 text-sm text-slate-700">{g.honest}</p>

          <h2 className="mt-12 text-2xl md:text-3xl">Syllabus the test and roadmap follow</h2>
          <p className="mt-2 text-slate-600">NCERT chapters{cls === "10" ? " for Class 10" : " for Class 11 and 12"}. Batch students get a week-by-week roadmap through these chapters.</p>
          <div className="mt-4 space-y-3">
            {subjectsFor(field).map((s) => (
              <details key={s} className="card group">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-brand-900">
                  {SUBJECT_NAME[s].en} ({syllabus[s].length} chapters)
                  <span className="text-2xl font-normal leading-none text-accent-500 transition-transform group-open:rotate-45" aria-hidden>
                    +
                  </span>
                </summary>
                <ol className="mt-3 list-decimal space-y-1 pl-6 text-sm text-slate-700">
                  {syllabus[s].map((c) => (
                    <li key={c.id}>
                      {c.title}
                      {cls !== "10" && <span className="text-slate-400"> (Class {c.level})</span>}
                    </li>
                  ))}
                </ol>
              </details>
            ))}
          </div>

          <h2 className="mt-12 text-2xl md:text-3xl">How it works</h2>
          <ol className="mt-4 space-y-3 text-slate-700">
            <li>
              <b>1. Log in with your mobile number.</b> One OTP, no password.
            </li>
            <li>
              <b>2. Tell us your class and stream.</b> The test is built for your field.
            </li>
            <li>
              <b>3. Take the test on your phone.</b> The timer keeps running even if the internet drops; answers are saved.
            </li>
            <li>
              <b>4. Get your result instantly,</b> then book a free guidance call if you want one.
            </li>
          </ol>

          <h2 className="mt-12 text-2xl md:text-3xl">Questions students ask</h2>
          <div className="mt-4 border-t border-slate-300">
            {g.faqs.map(([q, a]) => (
              <details key={q} className="group border-b border-slate-300">
                <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-3 text-lg font-semibold text-brand-900">
                  {q}
                  <span className="text-2xl font-normal leading-none text-accent-500 transition-transform group-open:rotate-45" aria-hidden>
                    +
                  </span>
                </summary>
                <p className="pb-4 text-slate-600">{a}</p>
              </details>
            ))}
          </div>

          <div className="mt-10 rounded-xl bg-brand-800 p-6 text-white md:p-8">
            <p className="text-2xl font-bold">Find your weak chapters today.</p>
            <p className="mt-2 text-brand-100">Free. Instant result. 3 attempts with different questions.</p>
            <Link href={cta} className="btn-accent mt-5 w-full text-lg sm:w-auto sm:px-7">
              Start the free test
            </Link>
          </div>

          <h2 className="mt-12 text-xl">More free tests</h2>
          <ul className="mt-3 space-y-2">
            {others.map((o) => (
              <li key={o.slug}>
                <Link href={`/${o.slug}`} className="font-semibold text-brand-700 underline underline-offset-4 hover:text-brand-900">
                  {o.title}
                </Link>
              </li>
            ))}
          </ul>
        </article>
      </main>
      <footer className="border-t border-slate-300 py-8 text-sm text-slate-500">
        <div className="container-x flex flex-col gap-2 md:flex-row md:justify-between">
          <p>
            © {new Date().getFullYear()} {BRAND}
          </p>
          <Link href="/privacy" className="hover:text-brand-900">
            Privacy
          </Link>
        </div>
      </footer>
    </>
  );
}
