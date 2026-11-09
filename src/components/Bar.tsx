export function barColor(p: number) {
  return p >= 70 ? "bg-brand-600" : p >= 50 ? "bg-brand-300" : "bg-accent-500";
}

export default function Bar({ label, pct, sub, neutral = false }: { label: string; pct: number; sub?: string; neutral?: boolean }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="font-medium">{label}</span>
        <span className="shrink-0 font-semibold tabular-nums">
          {sub && <span className="mr-2 font-normal text-slate-500">{sub}</span>}
          {Math.round(pct)}%
        </span>
      </div>
      <div className="mt-1.5 h-2 rounded-sm bg-slate-200">
        <div className={`h-2 rounded-sm ${neutral ? "bg-brand-600" : barColor(pct)}`} style={{ width: `${Math.max(2, pct)}%` }} />
      </div>
    </div>
  );
}
