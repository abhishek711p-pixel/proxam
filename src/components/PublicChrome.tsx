"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Lang } from "@/lib/types";

/** "Login" or "Dashboard". Static pages cannot read the session, so a small non-secret cookie tells us. */
export function AuthLink({ loginLabel, dashLabel, className }: { loginLabel: string; dashLabel: string; className: string }) {
  const [inside, setInside] = useState(false);
  useEffect(() => {
    setInside(/(?:^|;\s*)px_in=1/.test(document.cookie));
  }, []);
  return (
    <Link href={inside ? "/dashboard" : "/login"} className={className}>
      {inside ? dashLabel : loginLabel}
    </Link>
  );
}

/** Language switch for static pages: remembers the choice and opens the page in that language. */
export function LangLink({ lang, href, dark = false }: { lang: Lang; href: string; dark?: boolean }) {
  const router = useRouter();
  const next: Lang = lang === "en" ? "hi" : "en";
  return (
    <a
      href={href}
      hrefLang={next === "hi" ? "hi-IN" : "en-IN"}
      onClick={(e) => {
        e.preventDefault();
        document.cookie = `lang=${next}; path=/; max-age=31536000; samesite=lax`;
        router.push(href);
      }}
      className={`rounded-lg border px-3 py-1.5 text-sm font-semibold ${
        dark ? "border-white/30 text-white hover:bg-white/10" : "border-slate-400 text-brand-900 hover:bg-white"
      }`}
      aria-label="Change language"
    >
      {lang === "en" ? "हिंदी" : "English"}
    </a>
  );
}
