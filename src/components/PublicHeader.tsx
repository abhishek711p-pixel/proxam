import Link from "next/link";
import Logo from "./Logo";
import HtmlLang from "./HtmlLang";
import { AuthLink, LangLink } from "./PublicChrome";
import { t } from "@/lib/i18n";
import type { Lang } from "@/lib/types";

/**
 * Header for public pages (home, guides, privacy). Fully static, so these pages are served from the CDN
 * in milliseconds and never touch the database. `altHref` is the same page in the other language.
 */
export default function PublicHeader({ lang, altHref }: { lang: Lang; altHref?: string }) {
  const links: [string, string][] = [
    [lang === "hi" ? "/hi" : "/", t(lang, "home")],
    ["/masterclass", t(lang, "mc_nav")],
    ["/batch", t(lang, "batch_section")],
  ];
  const nav = (extra: string) =>
    links.map(([href, label]) => (
      <Link key={href} href={href} className={`btn-sm btn text-brand-900 hover:bg-white ${extra}`}>
        {label}
      </Link>
    ));
  return (
    <header className="no-print sticky top-0 z-30 border-b border-slate-300 bg-slate-50/95 backdrop-blur">
      <HtmlLang lang={lang} />
      <div className="container-x flex h-14 items-center justify-between gap-3 md:h-16">
        <Logo />
        <div className="flex items-center gap-1.5 sm:gap-2">
          <nav className="hidden items-center gap-1 sm:flex" aria-label="Main">
            {nav("")}
          </nav>
          {altHref && <LangLink lang={lang} href={altHref} />}
          <AuthLink loginLabel={t(lang, "login")} dashLabel={t(lang, "dashboard")} className="btn-sm btn bg-brand-800 text-white hover:bg-brand-900" />
        </div>
      </div>
      <nav className="container-x -mt-1 flex gap-1 pb-1.5 sm:hidden" aria-label="Main">
        {nav("min-h-8 first:-ml-3")}
      </nav>
    </header>
  );
}
