"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, X } from "lucide-react";
import type { NoticeItem } from "@/lib/notices";

const T = {
  en: { title: "Notifications", empty: "Nothing new yet. Messages from your mentors show up here.", all: "See all", replies: (n: number) => `${n} new mentor repl${n === 1 ? "y" : "ies"} to your doubts`, open: "Open", close: "Close" },
  hi: { title: "सूचनाएँ", empty: "अभी कुछ नया नहीं। मेंटर के संदेश यहाँ दिखेंगे।", all: "सब देखें", replies: (n: number) => `आपके डाउट पर मेंटर के ${n} नए जवाब`, open: "खोलें", close: "बंद करें" },
};

/** Bell with a drop-down list. Opening it marks the shown notifications as seen. */
export default function NoticeBell({
  items,
  lang,
  replies = 0,
  onReplies,
  buttonClassName = "",
  dotClassName = "",
}: {
  items: NoticeItem[];
  lang: "en" | "hi";
  replies?: number;
  onReplies?: () => void;
  buttonClassName?: string;
  dotClassName?: string;
}) {
  const t = T[lang];
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState<Set<string>>(new Set());
  const wrap = useRef<HTMLDivElement>(null);
  const unread = items.filter((n) => !n.read && !seen.has(n.id));
  const count = unread.length + replies;

  useEffect(() => {
    if (!open) return;
    const ids = items.filter((n) => !n.read).map((n) => n.id);
    if (ids.length) fetch("/api/notifications/read", { method: "POST", body: JSON.stringify({ ids }) }).catch(() => {});
    const out = (e: MouseEvent) => wrap.current && !wrap.current.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", out);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", out);
      document.removeEventListener("keydown", esc);
      // what was on screen counts as seen once the panel closes
      setSeen((s) => new Set([...s, ...ids]));
    };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div ref={wrap} className="relative">
      <button className={buttonClassName} aria-label={`${t.title}${count ? ` (${count})` : ""}`} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <Bell size={20} />
        {count > 0 && <span className={dotClassName} />}
      </button>
      {open && (
        <div className="fixed inset-x-3 top-16 z-50 max-h-[70vh] overflow-y-auto rounded-xl border border-slate-300 bg-white text-left text-slate-800 shadow-[0_16px_40px_-20px_rgba(42,54,34,0.55)] sm:absolute sm:inset-x-auto sm:right-0 sm:top-[calc(100%+8px)] sm:w-96">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <b className="font-display text-base text-brand-900">{t.title}</b>
            <button className="rounded-md p-1 text-slate-500 hover:bg-slate-100" aria-label={t.close} onClick={() => setOpen(false)}>
              <X size={18} />
            </button>
          </div>
          {replies > 0 && (
            <button
              className="flex w-full items-center gap-2 border-b border-slate-200 bg-accent-50 px-4 py-3 text-left text-sm font-semibold text-accent-800"
              onClick={() => {
                setOpen(false);
                onReplies?.();
              }}
            >
              {t.replies(replies)}
              <span className="ml-auto underline">{t.open}</span>
            </button>
          )}
          {items.length === 0 && replies === 0 && <p className="px-4 py-6 text-sm text-slate-600">{t.empty}</p>}
          <ul className="divide-y divide-slate-100">
            {items.slice(0, 8).map((n) => (
              <li key={n.id} className={`px-4 py-3 ${!n.read && !seen.has(n.id) ? "bg-brand-50" : ""}`}>
                <p className="flex items-start gap-2 text-sm font-bold text-brand-900">
                  {!n.read && !seen.has(n.id) && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent-600" />}
                  {n.title}
                </p>
                {n.body && <p className="mt-1 line-clamp-4 whitespace-pre-wrap text-sm text-slate-700">{n.body}</p>}
                <p className="mt-1 flex items-center gap-3 text-xs text-slate-500">
                  {n.when}
                  {n.link && (
                    <a href={n.link} target={n.link.startsWith("/") ? undefined : "_blank"} rel="noreferrer" className="font-semibold text-brand-700 underline">
                      {t.open}
                    </a>
                  )}
                </p>
              </li>
            ))}
          </ul>
          {items.length > 0 && (
            <Link href="/notifications" className="block border-t border-slate-200 px-4 py-3 text-center text-sm font-semibold text-brand-700 hover:bg-slate-50">
              {t.all}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
