"use client";
import { useState } from "react";
import Link from "next/link";
import { FIELDS, classLabel, priceFor, type ClassLevel, type FieldId, type Stream } from "@/lib/config";
import { TRACKS, TRACK_IDS, batchFieldLabel, batchPrice, isTrack, type BatchField, type Track } from "@/lib/batches";
import { t as tr, type Key } from "@/lib/i18n";
import { CARD_FEATURES, CLASS_COPY, batchHref } from "@/lib/batchCopy";
import type { Lang } from "@/lib/types";
import { Tick } from "./Marks";

const TRACK_COPY: Record<Track, { tag: Key; focus: Key }> = {
  jee: { tag: "t_jee_tag", focus: "t_jee_focus" },
  neet: { tag: "t_neet_tag", focus: "t_neet_focus" },
  boards_pcm: { tag: "t_boards_tag", focus: "t_boards_focus" },
  boards_pcb: { tag: "t_boards_tag", focus: "t_boards_focus" },
};

/** One price card for one batch (class + field, or a Class 12 Science track). */
export function BatchCard({
  cls,
  field,
  lang,
  dark = false,
  mine = false,
  showCta = true,
  features = true,
}: {
  cls: ClassLevel;
  field: BatchField;
  lang: Lang;
  dark?: boolean;
  mine?: boolean;
  showCta?: boolean;
  features?: boolean;
}) {
  const t = (k: Key) => tr(lang, k);
  const c = CLASS_COPY[cls];
  const price = batchPrice(cls, field);
  const tc = isTrack(field) ? TRACK_COPY[field] : undefined;
  const focus = tc ? [tc.focus] : c.focus;
  const goals = isTrack(field) ? TRACKS[field].goals : FIELDS[field].goals;
  return (
    <div className={`flex flex-col rounded-xl p-6 md:p-8 ${dark ? "bg-brand-800 text-white" : "border border-slate-300 bg-white"}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className={`pill border ${dark ? "border-brand-300/60 text-brand-100" : "border-brand-300 text-brand-700"}`}>{t(tc ? tc.tag : c.tag)}</span>
        {mine && <span className="pill bg-accent-500 text-white">{t("your_batch")}</span>}
      </div>
      <h3 className={`mt-4 text-2xl ${dark ? "text-white" : ""}`}>{t(c.title)}</h3>
      <p className={`${dark ? "text-brand-200" : "text-slate-500"}`}>{batchFieldLabel(field, lang)}</p>

      <div className={`mt-6 border-y py-4 ${dark ? "border-brand-600" : "border-slate-300"}`}>
        <p className="flex items-baseline gap-2">
          <span className="font-display text-6xl font-bold tracking-tight">₹{price}</span>
          <span className={dark ? "text-brand-200" : "text-slate-500"}>{t("per_6_months")}</span>
        </p>
        <p className={`mt-1 text-sm ${dark ? "text-brand-200" : "text-slate-500"}`}>{t("one_time_note")}</p>
      </div>

      <ul className="mt-5 flex-1 space-y-3">
        {focus.map((k) => (
          <li key={k} className="font-semibold">
            {t(k)}
          </li>
        ))}
        <li className={dark ? "text-brand-100" : "text-slate-600"}>
          {t("targets")}: {goals}
        </li>
        {features && CARD_FEATURES.map((k) => (
          <li key={k} className="flex items-start gap-2.5">
            <Tick className={`mt-0.5 h-5 w-5 shrink-0 ${dark ? "text-accent-300" : "text-accent-500"}`} />
            {t(k)}
          </li>
        ))}
      </ul>

      {showCta && (
        <Link href={batchHref(cls, field)} className={`${dark ? "btn-accent" : "btn-primary"} mt-7 w-full`}>
          {t("join_for")} ₹{price}
        </Link>
      )}
    </div>
  );
}

type Tab = "10" | "science" | "commerce";

/** Tabs at the top: Class 10 Board | Science | Commerce, then field chips, then one card per class. */
export default function Pricing({
  lang,
  freeHref,
  initial,
}: {
  lang: Lang;
  freeHref: string;
  initial?: { cls: ClassLevel; field: BatchField; stream: Stream };
}) {
  const t = (k: Key) => tr(lang, k);
  const startTab: Tab = initial ? (initial.cls === "10" ? "10" : (initial.stream as Tab)) : "science";
  const [tab, setTab] = useState<Tab>(startTab);
  const initField = initial && !isTrack(initial.field) ? initial.field : undefined;
  const defaults: Record<"science" | "commerce", FieldId> = {
    science: initial?.stream === "science" && initField ? initField : "pcm",
    commerce: initial?.stream === "commerce" && initField ? initField : "commerce_maths",
  };
  const [field, setField] = useState<Record<"science" | "commerce", FieldId>>(defaults);
  // Class 12 Science: four batches instead of fields
  const [track, setTrack] = useState<Track>(initial && isTrack(initial.field) ? initial.field : "jee");

  const tabs: { id: Tab; label: string }[] = [
    { id: "science", label: t("science") },
    { id: "commerce", label: t("commerce") },
    { id: "10", label: t("tab_10") },
  ];
  const classes: ClassLevel[] = tab === "10" ? ["10"] : ["11", "12", "dropper"];
  // One class is shown at a time. Default: the student's own class, else Class 12.
  const [pickedCls, setPickedCls] = useState<ClassLevel>(initial && initial.cls !== "10" ? initial.cls : "12");
  const shownCls: ClassLevel = tab === "10" ? "10" : pickedCls;
  const tracks = tab === "science" && shownCls === "12";
  const chips: { id: BatchField; label: string; price?: number }[] = tracks
    ? TRACK_IDS.map((id) => ({ id, label: batchFieldLabel(id, lang), price: TRACKS[id].price }))
    : tab === "10"
      ? []
      : Object.values(FIELDS).filter((f) => f.stream === tab).map((f) => ({ id: f.id, label: f.label[lang] }));
  const currentField: BatchField = tab === "10" ? "foundation10" : tracks ? track : field[tab];
  const classPrice = (cls: ClassLevel) => (tab === "science" && cls === "12" ? Math.min(...TRACK_IDS.map((x) => TRACKS[x].price)) : priceFor(cls));

  return (
    <div>
      {/* stream tabs */}
      <div role="tablist" className="flex gap-6 border-b border-slate-400/70">
        {tabs.map((x) => (
          <button
            key={x.id}
            role="tab"
            aria-selected={tab === x.id}
            onClick={() => setTab(x.id)}
            className={`-mb-px min-h-12 border-b-[3px] text-base font-semibold transition-colors md:text-lg ${
              tab === x.id ? "border-accent-500 text-brand-900" : "border-transparent text-slate-600 hover:text-brand-900"
            }`}
          >
            {x.label}
          </button>
        ))}
      </div>

      {/* class picker with prices: choose one, see one card */}
      {classes.length > 1 && (
        <div className="mt-4">
          <p className="mb-2 text-sm font-semibold text-brand-900">{t("class")}</p>
          <div role="tablist" className="grid grid-cols-3 gap-2 md:max-w-xl">
            {classes.map((cls) => (
              <button
                key={cls}
                role="tab"
                aria-selected={shownCls === cls}
                onClick={() => setPickedCls(cls)}
                className={`rounded-md border px-2 py-2 text-left transition-colors md:px-3 ${
                  shownCls === cls ? "border-brand-800 bg-brand-800 text-white" : "border-slate-400 bg-white text-brand-900 hover:border-brand-800"
                }`}
              >
                <span className={`block text-sm ${shownCls === cls ? "text-brand-200" : "text-slate-500"}`}>{classLabel(cls, lang)}</span>
                <span className="block font-display text-xl font-bold">
                  {tab === "science" && cls === "12" ? `${lang === "hi" ? "₹" : "from ₹"}${classPrice(cls)}${lang === "hi" ? " से" : ""}` : `₹${classPrice(cls)}`}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* field chips (Class 12 Science: the four batches) */}
      {chips.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-sm font-semibold text-brand-900">{t(tracks ? "choose_batch" : "choose_field")}</p>
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0">
            {chips.map((f) => (
              <button
                key={f.id}
                onClick={() => (tracks ? setTrack(f.id as Track) : setField((p) => ({ ...p, [tab]: f.id as FieldId })))}
                aria-pressed={currentField === f.id}
                className={`min-h-11 shrink-0 rounded-md border px-4 text-sm font-semibold transition-colors ${
                  currentField === f.id ? "border-brand-800 bg-brand-800 text-white" : "border-slate-400 bg-white text-brand-900 hover:border-brand-800"
                }`}
              >
                {f.label}
                {f.price !== undefined && <span className="ml-1.5 font-normal opacity-80">₹{f.price}</span>}
              </button>
            ))}
          </div>
          {tracks && <p className="mt-2 text-sm text-slate-600">{t("track_help")}</p>}
        </div>
      )}

      {/* the one selected card, with the free option beside it on bigger screens */}
      <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-[1.5fr_1fr] lg:gap-6">
        <BatchCard key={`${shownCls}-${currentField}`} cls={shownCls} field={currentField} lang={lang} dark mine={initial?.cls === shownCls && (!isTrack(initial.field) || initial.field === currentField)} />
        <div className="md:hidden">
          <FreeCard lang={lang} href={freeHref} strip />
        </div>
        <div className="hidden md:flex">
          <FreeCard lang={lang} href={freeHref} />
        </div>
      </div>
      {tab !== "10" && <p className="mt-3 text-sm text-slate-600">{t("dropper_help")}</p>}
    </div>
  );
}

function FreeCard({ lang, href, strip = false }: { lang: Lang; href: string; strip?: boolean }) {
  const t = (k: Key) => tr(lang, k);
  if (strip)
    return (
      <div className="flex flex-col gap-3 rounded-xl border border-slate-400 bg-white p-5">
        <div>
          <h3 className="text-lg">{t("free_strip_t")}</h3>
          <p className="text-slate-600">{t("free_strip_d")}</p>
        </div>
        <Link href={href} className="btn-ghost">
          {t("start_free")}
        </Link>
      </div>
    );
  return (
    <div className="flex w-full flex-col rounded-xl border border-slate-400 bg-white p-6 md:p-8">
      <h3 className="text-2xl">{t("free_strip_t")}</h3>
      <p className="mt-6 border-y border-slate-300 py-4 font-display text-6xl font-bold tracking-tight text-brand-900">₹0</p>
      <ul className="mt-5 flex-1 space-y-3">
        {(["pf_1", "pf_2", "pf_3", "pf_4"] as Key[]).map((k) => (
          <li key={k} className="flex items-start gap-2.5">
            <Tick className="mt-0.5 h-5 w-5 shrink-0 text-accent-500" />
            {t(k)}
          </li>
        ))}
      </ul>
      <Link href={href} className="btn-ghost mt-7 w-full">
        {t("start_free")}
      </Link>
    </div>
  );
}
