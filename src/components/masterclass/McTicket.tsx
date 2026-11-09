import { translator } from "@/lib/i18n";
import { fmtMcDate, fmtMcTime, mcAudience, mcWhatsAppText } from "@/lib/masterclass";
import type { Lang, Masterclass } from "@/lib/types";
import McDate from "./McDate";
import { WaIcon } from "./WaIcon";

/** The booked seat: looks like a ticket. Join, send to own WhatsApp, save to calendar. */
export default function McTicket({ m, lang, mobile, compact = false }: { m: Masterclass; lang: Lang; mobile: string; compact?: boolean }) {
  const t = translator(lang);
  const site = process.env.SITE_URL || "http://localhost:3000";
  const wa = `https://wa.me/91${mobile}?text=${encodeURIComponent(mcWhatsAppText(m, site))}`;
  return (
    <article className="grid overflow-hidden rounded-xl border border-brand-800 bg-white md:grid-cols-[14rem_1fr]">
      {/* stub */}
      <div className="relative flex items-center gap-4 bg-brand-800 p-5 text-white md:flex-col md:items-start md:gap-5 md:p-6">
        <McDate iso={m.startsAt} lang={lang} dark />
        <div>
          <p className="text-sm font-semibold text-brand-200">{t("mc_ticket_t")}</p>
          <p className="font-display text-xl font-bold">{fmtMcTime(m.startsAt)}</p>
          <p className="text-sm text-brand-200">
            {m.minutes} {t("minutes")}, {mcAudience(m, lang)}
          </p>
        </div>
        {/* perforation */}
        <span className="absolute -bottom-px left-0 right-0 border-b-2 border-dashed border-slate-50/60 md:bottom-0 md:left-auto md:right-[-1px] md:top-0 md:h-full md:w-0 md:border-b-0 md:border-r-2" aria-hidden />
      </div>

      <div className="p-5 md:p-6">
        <h3 className="text-xl md:text-2xl">{m.title}</h3>
        {!compact && <p className="mt-2 max-w-2xl text-slate-600">{m.desc}</p>}
        <p className="mt-3 font-semibold text-brand-900">
          {fmtMcDate(m.startsAt, lang)}, {fmtMcTime(m.startsAt)}
        </p>
        {m.host && (
          <p className="text-sm text-slate-600">
            {t("mc_host")}: {m.host}
          </p>
        )}
        <p className="mt-1 text-sm text-slate-500">{t("mc_fixed")}</p>

        <div className="mt-4 grid gap-2 sm:flex sm:flex-wrap">
          {m.meetingLink ? (
            <a href={m.meetingLink} target="_blank" rel="noreferrer" className="btn-primary w-full sm:w-auto">
              {t("mc_join")}
            </a>
          ) : (
            <p className="w-full rounded-md bg-slate-100 px-3 py-2 text-sm text-slate-700">{t("mc_link_soon")}</p>
          )}
          <a href={wa} target="_blank" rel="noreferrer" className="btn w-full border border-[#25D366] bg-white text-[#0f6b5c] hover:bg-[#25D366]/10 sm:w-auto">
            <WaIcon />
            {t("send_to_wa")}
          </a>
          <a href={`/api/masterclass/${m.id}/ics`} className="btn-ghost w-full sm:w-auto">
            {t("add_to_calendar")}
          </a>
        </div>
        {!compact && <p className="mt-2 text-sm text-slate-500">{t("mc_save_note")}</p>}
      </div>
    </article>
  );
}
