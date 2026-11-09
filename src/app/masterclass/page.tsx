import Link from "next/link";
import Header from "@/components/Header";
import McSchedule, { type McRow } from "@/components/masterclass/McSchedule";
import McTicket from "@/components/masterclass/McTicket";
import McDate from "@/components/masterclass/McDate";
import McBookButton from "@/components/masterclass/McBookButton";
import { pageUser } from "@/lib/pageUser";
import { demoPayments } from "@/lib/batch";
import { BRAND, CLASSES, classLabel } from "@/lib/config";
import { allMasterclasses } from "@/lib/store";
import { getLang } from "@/lib/lang";
import { translator } from "@/lib/i18n";
import { MC_TRACK, fmtMcDate, fmtMcTime, mcAudience, mcDay, mcIsOver, mcMatches, mcMonth, mcWeekday, seatsOf, upcomingFor, upcomingMasterclasses } from "@/lib/masterclass";

export const metadata = {
  title: "Live Masterclass for Class 10, 11, 12 at ₹1",
  description: "Live masterclasses with mentors for Class 10, 11, 12 and droppers: exam strategy, chapter deep dives and career talks. First one for ₹1.",
  alternates: { canonical: "/masterclass" },
};

export default async function MasterclassPage() {
  const [user, lang] = await Promise.all([pageUser(), getLang()]);
  const t = translator(lang);
  const mcs = await allMasterclasses();
  const demo = demoPayments();
  const fresh = user;
  const p = fresh?.profile;

  const seats = fresh ? seatsOf(mcs, fresh) : [];
  const upcomingSeats = seats.filter((x) => !mcIsOver(x.mc) && x.mc.status === "scheduled");
  const pastSeats = seats.filter((x) => mcIsOver(x.mc) && x.mc.status === "scheduled");
  const cancelledSeats = seats.filter((x) => !mcIsOver(x.mc) && x.mc.status === "cancelled");
  const bookedIds = new Set(seats.map((x) => x.mc.id));
  const offers = p ? upcomingFor(mcs, p).filter((m) => !bookedIds.has(m.id)) : [];

  // Every upcoming masterclass, formatted here so the browser shows exactly the same text
  const rows: McRow[] = upcomingMasterclasses(mcs).map((m) => {
    const mine = Boolean(p && mcMatches(m, p));
    return {
      id: m.id,
      cls: m.cls,
      track: m.field ? MC_TRACK[m.field][lang] : `${classLabel(m.cls, lang)}, ${t("mc_all_streams")}`,
      forNote: t("mc_for_students").replace("{cls}", mcAudience(m, lang)),
      title: m.title,
      desc: m.desc,
      weekday: mcWeekday(m.startsAt, lang),
      day: mcDay(m.startsAt),
      month: mcMonth(m.startsAt, lang),
      when: fmtMcTime(m.startsAt),
      minutes: m.minutes,
      host: m.host,
      price: m.price,
      mine,
      state: bookedIds.has(m.id) ? "booked" : !fresh ? "login" : !p ? "onboard" : mine ? "bookable" : "other",
    };
  });
  const tabs = CLASSES.map((c) => ({ id: c, label: classLabel(c, lang) }));

  return (
    <>
      <Header active="masterclass" />
      <main className="container-x py-8 md:py-12">
        <h1 className="text-[2.2rem] md:text-5xl">{t("mc_nav")}</h1>
        <p className="mt-3 max-w-2xl text-slate-600 md:text-lg">{t("mc_page_sub")}</p>

        <div className="mt-8 space-y-12">
          {cancelledSeats.map(({ mc }) => (
            <p key={mc.id} className="error">
              {t("mc_cancelled")}: {mc.title}
            </p>
          ))}

          {/* booked seats */}
          {upcomingSeats.length > 0 && (
            <section>
              <h2 className="text-2xl md:text-3xl">{t("mc_your")}</h2>
              <div className="mt-4 space-y-4">
                {upcomingSeats.map(({ mc }) => (
                  <McTicket key={mc.id} m={mc} lang={lang} mobile={fresh!.mobile} />
                ))}
              </div>
            </section>
          )}

          {/* the ones meant for this student, not booked yet */}
          {offers.length > 0 && (
            <section>
              <h2 className="text-2xl md:text-3xl">{t("mc_for_your_class")}</h2>
              <div className="mt-4 space-y-4">
                {offers.map((offer) => (
                  <div key={offer.id} className="rounded-xl border border-accent-500 bg-white p-5 md:p-7">
                    <div className="flex gap-4">
                      <McDate iso={offer.startsAt} lang={lang} />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-brand-700">{mcAudience(offer, lang)}</p>
                        <h3 className="mt-0.5 text-xl md:text-2xl">{offer.title}</h3>
                        <p className="mt-1 font-semibold text-brand-900">
                          {fmtMcDate(offer.startsAt, lang)}, {fmtMcTime(offer.startsAt)}, {offer.minutes} {t("minutes")}
                        </p>
                        {offer.host && (
                          <p className="text-sm text-slate-600">
                            {t("mc_host")}: {offer.host}
                          </p>
                        )}
                      </div>
                    </div>
                    <p className="mt-4 max-w-2xl text-slate-700">{offer.desc}</p>
                    <p className="mt-2 text-sm text-slate-500">{t("mc_fixed")}</p>
                    <div className="mt-5 flex flex-col gap-4 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
                      <p className="font-display text-5xl font-bold text-accent-500">₹{offer.price}</p>
                      <McBookButton id={offer.id} price={offer.price} lang={lang} demo={demo} />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {p && upcomingSeats.length === 0 && offers.length === 0 && <p className="card text-slate-600">{t("mc_none")}</p>}

          {/* every masterclass, by class */}
          <section id="all">
            <h2 className="text-2xl md:text-3xl">{t("mc_all")}</h2>
            <p className="mt-2 max-w-2xl text-slate-600">{t("mc_all_d")}</p>
            {!p && <p className="mt-4 max-w-2xl rounded-md border-l-4 border-accent-500 bg-white px-4 py-3 text-brand-900">{t("mc_login_note")}</p>}
            <p className="mt-3 flex items-start gap-2 text-sm text-slate-500">
              <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <rect x="3" y="5" width="18" height="16" rx="2" />
                <path d="M3 10h18M8 3v4M16 3v4" />
              </svg>
              {t("mc_fixed")}
            </p>
            <div className="mt-5">
              <McSchedule rows={rows} tabs={tabs} initialTab={p?.cls || "12"} lang={lang} demo={demo} />
            </div>
            {!user && (
              <Link href="/login?next=/masterclass" className="btn-primary mt-6 w-full sm:w-auto">
                {t("login")}
              </Link>
            )}
          </section>

          {pastSeats.length > 0 && (
            <section>
              <h2 className="text-xl">{t("mc_past")}</h2>
              <ul className="mt-3 border-t border-slate-300">
                {pastSeats.map(({ mc }) => (
                  <li key={mc.id} className="flex items-center gap-4 border-b border-slate-300 py-3">
                    <McDate iso={mc.startsAt} lang={lang} />
                    <div>
                      <p className="font-semibold text-brand-900">{mc.title}</p>
                      <p className="text-sm text-slate-500">{t("mc_over")}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </main>
    </>
  );
}
