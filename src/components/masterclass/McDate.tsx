import { mcDay, mcMonth, mcWeekday } from "@/lib/masterclass";
import type { Lang } from "@/lib/types";

type BoxProps = { weekday: string; day: string; month: string; dark?: boolean; className?: string };

/** Calendar-page style date block: weekday, big day number, month. Strings come pre-formatted. */
export function McDateBox({ weekday, day, month, dark = false, className = "" }: BoxProps) {
  return (
    <div className={`flex w-16 shrink-0 self-start flex-col items-center overflow-hidden rounded-md border text-center ${dark ? "border-brand-600 bg-brand-900 text-white" : "border-slate-400 bg-white text-brand-900"} ${className}`}>
      <span className={`w-full py-0.5 text-[11px] font-semibold ${dark ? "bg-accent-500 text-white" : "bg-brand-800 text-white"}`}>{weekday}</span>
      <span className="font-display text-2xl font-bold leading-8">{day}</span>
      <span className={`pb-1 text-xs ${dark ? "text-brand-200" : "text-slate-500"}`}>{month}</span>
    </div>
  );
}

export default function McDate({ iso, lang, dark = false, className = "" }: { iso: string; lang: Lang; dark?: boolean; className?: string }) {
  return <McDateBox weekday={mcWeekday(iso, lang)} day={mcDay(iso)} month={mcMonth(iso, lang)} dark={dark} className={className} />;
}
