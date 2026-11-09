"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { t } from "@/lib/i18n";
import type { Lang } from "@/lib/types";

type Day = { date: string; slots: { start: string; available: boolean }[] };

const fmtDay = (d: string, lang: Lang) =>
  new Date(`${d}T12:00:00+05:30`).toLocaleDateString(lang === "hi" ? "hi-IN" : "en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "Asia/Kolkata" });
const fmtTime = (s: string) =>
  new Date(s).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });

export default function BookingForm({ lang, days, rescheduling, zoomOk }: { lang: Lang; days: Day[]; rescheduling: boolean; zoomOk: boolean }) {
  const router = useRouter();
  const [platform, setPlatform] = useState<"meet" | "zoom">("meet");
  const [day, setDay] = useState(days[0]?.date || "");
  const [slot, setSlot] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const current = days.find((d) => d.date === day);

  async function book() {
    setBusy(true);
    setError("");
    const r = await fetch("/api/bookings", { method: "POST", body: JSON.stringify({ slotStart: slot, platform }) })
      .then((r) => r.json())
      .catch(() => null);
    setBusy(false);
    if (!r?.ok) return setError(r?.error || t(lang, "error_generic"));
    setDone(true);
    router.refresh();
  }

  if (done) {
    return (
      <div className="card mt-6 text-center">
        
        <p className="mt-2 text-xl font-bold">{t(lang, "booked_title")}</p>
        <p className="mt-1 font-semibold text-brand-700">
          {fmtDay(slot.slice(0, 10), lang)}, {fmtTime(slot)}, {platform === "meet" ? "Google Meet" : "Zoom"}
        </p>
        <p className="mt-2 text-slate-600">{t(lang, "booked_desc")}</p>
        <p className="mt-2 text-sm text-slate-600">🔔 {t(lang, "sms_reminders")}</p>
        <Link href="/dashboard" className="btn-primary mt-5 w-full md:w-auto">
          {t(lang, "go_dashboard")}
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-5 pb-24 md:pb-0">
      <section className="card">
        <p className="label">{t(lang, "pick_platform")}</p>
        <div className={`grid gap-2 ${zoomOk ? "grid-cols-2" : "grid-cols-1"}`}>
          {(zoomOk ? (["meet", "zoom"] as const) : (["meet"] as const)).map((p) => (
            <button
              key={p}
              onClick={() => setPlatform(p)}
              aria-pressed={platform === p}
              className={`min-h-14 rounded-xl border font-semibold ${platform === p ? "border-brand-600 bg-brand-50 text-brand-700 ring-2 ring-brand-100" : "border-slate-300 bg-white"}`}
            >
              {p === "meet" ? "Google Meet" : "Zoom"}
            </button>
          ))}
        </div>
      </section>

      <section className="card">
        <p className="label">{t(lang, "pick_day")}</p>
        <div className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1">
          {days.map((d) => (
            <button
              key={d.date}
              onClick={() => {
                setDay(d.date);
                setSlot("");
              }}
              className={`min-h-14 shrink-0 snap-start rounded-xl border px-4 text-sm font-semibold ${
                day === d.date ? "border-brand-600 bg-brand-600 text-white" : "border-slate-300 bg-white"
              }`}
            >
              {fmtDay(d.date, lang)}
            </button>
          ))}
        </div>

        <p className="label mt-5">{t(lang, "pick_time")}</p>
        {current && current.slots.some((s) => s.available) ? (
          <div className="grid grid-cols-3 gap-2 md:grid-cols-5">
            {current.slots.map((s) => (
              <button
                key={s.start}
                disabled={!s.available}
                onClick={() => setSlot(s.start)}
                className={`min-h-11 rounded-lg border text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-35 disabled:line-through ${
                  slot === s.start ? "border-brand-600 bg-brand-600 text-white" : "border-slate-300 bg-white"
                }`}
              >
                {fmtTime(s.start)}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-slate-500">{t(lang, "no_slots")}</p>
        )}
      </section>

      {error && <p className="error">{error}</p>}

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:static md:border-0 md:bg-transparent md:p-0">
        <button className="btn-primary w-full md:w-auto" disabled={!slot || busy} onClick={book}>
          {busy ? t(lang, "loading") : rescheduling ? `${t(lang, "reschedule")} ✓` : t(lang, "confirm_booking")}
        </button>
      </div>
    </div>
  );
}
