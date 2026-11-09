import { redirect } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import BookingForm from "./BookingForm";
import { pageUser } from "@/lib/pageUser";
import { getLang } from "@/lib/lang";
import { userAttempts, userBookings } from "@/lib/store";
import { buildSlots } from "@/lib/slots";
import { translator } from "@/lib/i18n";

export default async function BookCall() {
  const [user, lang] = await Promise.all([pageUser(), getLang()]);
  if (!user) redirect("/login");
  if (!user.profile) redirect("/onboarding");
  const [attempts, bookings] = await Promise.all([userAttempts(user.id), userBookings(user.id)]);
  const t = translator(lang);
  const hasResult = attempts.some((a) => a.status === "submitted");
  const existing = bookings.find((b) => b.status === "booked");

  return (
    <>
      <Header />
      <main className="container-x py-6 md:py-10">
        <div className="mx-auto max-w-2xl">
          <h1 className="text-2xl font-bold md:text-3xl">{t("book_title")}</h1>
          <p className="mt-1 text-slate-600">{t("book_sub")}</p>
          {hasResult ? (
            <BookingForm lang={lang} days={await buildSlots()} rescheduling={Boolean(existing)} />
          ) : (
            <div className="card mt-6 text-center">
              <p>{t("take_test_first")}</p>
              <Link href="/test" className="btn-primary mt-4">
                {t("start_test")}
              </Link>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
