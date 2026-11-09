"use client";
import { useState } from "react";
import Link from "next/link";
import { t as tr, type Key } from "@/lib/i18n";
import type { Lang } from "@/lib/types";
import { McDateBox } from "./McDate";
import McBookButton from "./McBookButton";

export type McRow = {
  id: string;
  cls: string;
  track: string;
  title: string;
  desc: string;
  weekday: string;
  day: string;
  month: string;
  when: string;
  minutes: number;
  host?: string;
  price: number;
  state: "booked" | "bookable" | "login" | "onboard" | "other";
  mine: boolean;
  forNote: string;
};

/** Every upcoming masterclass, one tab per class. Strings are formatted on the server. */
export default function McSchedule({ rows, tabs, initialTab, lang, demo }: { rows: McRow[]; tabs: { id: string; label: string }[]; initialTab: string; lang: Lang; demo: boolean }) {
  const t = (k: Key) => tr(lang, k);
  const [tab, setTab] = useState(initialTab);
  const shown = rows.filter((r) => r.cls === tab);

  return (
    <div>
      <div role="tablist" className="flex gap-5 overflow-x-auto border-b border-slate-400/70">
        {tabs.map((x) => (
          <button
            key={x.id}
            role="tab"
            aria-selected={tab === x.id}
            onClick={() => setTab(x.id)}
            className={`-mb-px min-h-12 shrink-0 border-b-[3px] font-semibold transition-colors md:text-lg ${
              tab === x.id ? "border-accent-500 text-brand-900" : "border-transparent text-slate-600 hover:text-brand-900"
            }`}
          >
            {x.label}
            <span className="ml-1.5 text-sm font-normal text-slate-500">{rows.filter((r) => r.cls === x.id).length}</span>
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <p className="py-6 text-slate-600">{t("mc_none_tab")}</p>
      ) : (
        <ul>
          {shown.map((m) => (
            <li key={m.id} className={`grid grid-cols-[4rem_1fr] gap-x-4 gap-y-3 border-b border-slate-300 py-5 md:grid-cols-[4rem_1fr_15rem] md:items-start ${m.mine ? "bg-brand-50 md:-mx-4 md:px-4" : ""}`}>
              <McDateBox weekday={m.weekday} day={m.day} month={m.month} />
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2">
                  <span className="pill border border-brand-300 bg-white text-brand-800">{m.track}</span>
                  {m.mine && <span className="pill bg-brand-800 text-white">{t("mc_for_you")}</span>}
                </p>
                <h3 className="mt-1.5 text-lg leading-snug md:text-xl">{m.title}</h3>
                <p className="mt-1 text-sm font-semibold text-brand-900">
                  {m.when}, {m.minutes} {t("minutes")}
                  {m.host ? `, ${m.host}` : ""}
                </p>
                <p className="mt-1 max-w-xl text-sm text-slate-600">{m.desc}</p>
              </div>
              <div className="col-span-2 md:col-span-1 md:text-right">
                {m.state === "booked" ? (
                  <span className="pill bg-brand-800 px-3 py-1.5 text-sm text-white">{t("mc_booked_pill")}</span>
                ) : m.state === "bookable" ? (
                  <McBookButton id={m.id} price={m.price} lang={lang} demo={demo} />
                ) : m.state === "login" ? (
                  <Link href="/login?next=/masterclass" className="btn-accent w-full md:w-auto">
                    {t("mc_book")} ₹{m.price}
                  </Link>
                ) : m.state === "onboard" ? (
                  <Link href="/onboarding?next=/masterclass" className="btn-accent w-full md:w-auto">
                    {t("mc_book")} ₹{m.price}
                  </Link>
                ) : (
                  <p className="text-sm text-slate-500">{m.forNote}</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
