import Link from "next/link";
import Logo from "./Logo";
import LangToggle from "./LangToggle";
import { pageUser, headerNotices } from "@/lib/pageUser";
import { getLang } from "@/lib/lang";
import { t } from "@/lib/i18n";
import { noticeItems } from "@/lib/notices";
import HtmlLang from "./HtmlLang";
import type { Notice } from "@/lib/types";
import NoticeBell from "./NoticeBell";

type Active = "home" | "dashboard" | "batch" | "masterclass";

export default async function Header({ dark = false, active, notices: given }: { dark?: boolean; active?: Active; notices?: Notice[] }) {
  const [user, lang] = await Promise.all([pageUser(), getLang()]);
  // First link: Home before login, Dashboard after login
  const links: [Active, string, string][] = [
    user ? ["dashboard", "/dashboard", t(lang, "dashboard")] : ["home", "/", t(lang, "home")],
    ["masterclass", "/masterclass", t(lang, "mc_nav")],
    ["batch", "/batch", t(lang, "batch_section")],
  ];
  const notices = user ? noticeItems(given || (await headerNotices(user)), user, lang) : [];
  const linkCls = (id: Active) =>
    `${dark ? "text-white hover:bg-white/10" : "text-brand-900 hover:bg-white"} ${active === id ? "underline decoration-accent-500 decoration-2 underline-offset-[6px]" : ""}`;
  const navLinks = (extra: string) =>
    links.map(([id, href, label]) => (
      <Link key={id} href={href} aria-current={active === id ? "page" : undefined} className={`btn-sm btn ${linkCls(id)} ${extra}`}>
        {label}
      </Link>
    ));

  return (
    <header className={`no-print ${dark ? "" : "border-b border-slate-300 bg-slate-50/95 backdrop-blur"} sticky top-0 z-30`}>
      <div className="container-x flex h-14 items-center justify-between gap-3 md:h-16">
        <HtmlLang lang={lang} />
        <Logo dark={dark} />
        <div className="flex items-center gap-1.5 sm:gap-2">
          <nav className="hidden items-center gap-1 sm:flex" aria-label="Main">
            {navLinks("")}
          </nav>
          <LangToggle lang={lang} dark={dark} />
          {user && (
            <NoticeBell
              items={notices}
              lang={lang}
              buttonClassName={`relative grid h-9 w-9 place-items-center rounded-lg ${dark ? "text-white hover:bg-white/10" : "text-brand-900 hover:bg-white"}`}
              dotClassName="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-accent-500"
            />
          )}
          <Link href={user ? "/dashboard" : "/login"} className={`btn-sm btn ${dark ? "bg-white text-brand-800" : "bg-brand-800 text-white hover:bg-brand-900"}`}>
            {t(lang, user ? "dashboard" : "login")}
          </Link>
        </div>
      </div>
      {/* phones: the two links get their own row so nothing is squeezed */}
      <nav className="container-x -mt-1 flex gap-1 pb-1.5 sm:hidden" aria-label="Main">
        {navLinks("min-h-8 first:-ml-3")}
      </nav>
    </header>
  );
}
