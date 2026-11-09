import Link from "next/link";
import { isAdmin } from "@/lib/auth";
import { openDoubtCount } from "@/lib/store";
import { BRAND } from "@/lib/config";
import { AdminLogin, AdminLogout } from "./AdminClient";

export const metadata = { title: "Admin", robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!(await isAdmin())) {
    return (
      <main className="container-x flex min-h-dvh items-center justify-center py-10">
        <AdminLogin />
      </main>
    );
  }
  const waiting = await openDoubtCount();
  const nav = [
    ["/admin", "Overview"],
    ["/admin/students", "Students & leads"],
    ["/admin/batches", "Batches"],
    ["/admin/content", "Study material"],
    ["/admin/calendar", "Calendar"],
    ["/admin/calls", "Calls"],
    ["/admin/masterclasses", "Masterclasses"],
    ["/admin/doubts", "Doubts"],
    ["/admin/notifications", "Notifications"],
    ["/admin/messages", "Messages"],
    ["/admin/questions", "Question bank"],
  ];
  return (
    <div className="min-h-dvh bg-slate-100">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 px-4 py-2 md:h-14 md:flex-nowrap md:py-0">
          <Link href="/admin" className="py-1 font-extrabold">
            {BRAND} <span className="text-brand-600">Admin</span>
          </Link>
          <div className="ml-auto md:order-last">
            <AdminLogout />
          </div>
          <nav className="-mx-2 mt-1 flex w-full gap-1 overflow-x-auto md:mt-0 md:w-auto md:flex-1">
            {nav.map(([href, label]) => (
              <Link key={href} href={href} className="whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-100">
                {label}
                {href === "/admin/doubts" && waiting > 0 && <span className="ml-1.5 rounded-full bg-accent-500 px-1.5 text-xs text-white">{waiting}</span>}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
    </div>
  );
}
