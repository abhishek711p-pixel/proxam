import Link from "next/link";

/** Previous / next links that keep the current filters. */
export default function Pager({ base, params, page, hasNext, total }: { base: string; params: Record<string, string | undefined>; page: number; hasNext: boolean; total?: number }) {
  const href = (p: number) => {
    const sp = new URLSearchParams(Object.entries({ ...params, page: p > 1 ? String(p) : undefined }).filter(([, v]) => v) as [string, string][]);
    return `${base}${sp.size ? `?${sp}` : ""}`;
  };
  if (page === 1 && !hasNext) return null;
  return (
    <nav className="flex items-center gap-2 text-sm" aria-label="Pages">
      {page > 1 ? (
        <Link href={href(page - 1)} className="btn-ghost btn-sm">
          ‹ Previous
        </Link>
      ) : (
        <span className="btn-ghost btn-sm opacity-40">‹ Previous</span>
      )}
      <span className="text-slate-600">
        Page {page}
        {total !== undefined ? ` of ${Math.max(1, Math.ceil(total / 50))}` : ""}
      </span>
      {hasNext ? (
        <Link href={href(page + 1)} className="btn-ghost btn-sm">
          Next ›
        </Link>
      ) : (
        <span className="btn-ghost btn-sm opacity-40">Next ›</span>
      )}
    </nav>
  );
}
