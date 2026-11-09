import { redirect } from "next/navigation";
import Header from "@/components/Header";
import { headerNotices, pageUser } from "@/lib/pageUser";
import { markNoticesRead } from "@/lib/store";
import { getLang } from "@/lib/lang";
import { noticeItems } from "@/lib/notices";

export const metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const [user, lang] = await Promise.all([pageUser(), getLang()]);
  if (!user) redirect("/login");
  const items = noticeItems(await headerNotices(user), user, lang);
  // opening this page means everything listed has been seen
  const fresh = items.filter((n) => !n.read).map((n) => n.id);
  if (fresh.length) {
    await markNoticesRead(user.id, fresh);
    user.notifRead = [...(user.notifRead || []), ...fresh]; // so the header bell shows them as read too
  }
  const hi = lang === "hi";

  return (
    <>
      <Header />
      <main className="container-x max-w-2xl py-8 md:py-12">
        <h1 className="text-[2rem] md:text-4xl">{hi ? "सूचनाएँ" : "Notifications"}</h1>
        <p className="mt-2 text-slate-600">{hi ? "आपके मेंटर और Proxam टीम के संदेश।" : "Messages from your mentors and the Proxam team."}</p>
        {items.length === 0 ? (
          <p className="card mt-6 text-slate-600">{hi ? "अभी कोई सूचना नहीं।" : "No notifications yet."}</p>
        ) : (
          <ul className="mt-6 divide-y divide-slate-200 border-y border-slate-200">
            {items.map((n) => (
              <li key={n.id} className="py-4">
                <p className="flex items-start gap-2 font-bold text-brand-900">
                  {!n.read && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-accent-600" aria-label={hi ? "नया" : "New"} />}
                  {n.title}
                </p>
                {n.body && <p className="mt-1 whitespace-pre-wrap text-slate-700">{n.body}</p>}
                <p className="mt-1 flex flex-wrap items-center gap-3 text-sm text-slate-500">
                  {n.when}
                  {n.link && (
                    <a href={n.link} target={n.link.startsWith("/") ? undefined : "_blank"} rel="noreferrer" className="font-semibold text-brand-700 underline">
                      {hi ? "खोलें" : "Open link"}
                    </a>
                  )}
                </p>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
