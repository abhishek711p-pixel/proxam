import { redirect } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import StartButton from "./StartButton";
import { pageUser } from "@/lib/pageUser";
import { getLang } from "@/lib/lang";
import { userAttempts } from "@/lib/store";
import { EXTRA_TEST_PRICE, FIELDS, favouriteOptions, totalQuestions } from "@/lib/config";
import { paymentsEnabled } from "@/lib/batch";
import { translator, type Key } from "@/lib/i18n";
import { attemptsLeft, finalizeFor } from "@/lib/testEngine";

export default async function TestIntro() {
  const [user, lang] = await Promise.all([pageUser(), getLang()]);
  if (!user) redirect("/login?next=/test");
  if (!user.profile) redirect("/onboarding");
  await finalizeFor(user);
  const attempts = await userAttempts(user.id);
  const t = translator(lang);
  const open = attempts.find((a) => a.status === "in_progress");
  if (open) redirect(`/test/${open.id}`);

  const left = attemptsLeft(user, attempts);
  const f = FIELDS[user.profile.field];
  const inst: Key[] = ["inst_1", "inst_2", "inst_3", "inst_4", "inst_5", "inst_6"];
  const fav = f.favourite ? { options: favouriteOptions(f), ...f.favourite } : undefined;

  return (
    <>
      <Header />
      <main className="container-x py-6 md:py-12">
        <div className="mx-auto max-w-2xl space-y-4">
          <div>
            <p className="font-semibold text-brand-700">{f.label[lang]}</p>
            <h1 className="mt-1 text-3xl md:text-4xl">{t("instructions")}</h1>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="card p-3">
              <p className="font-display text-2xl font-bold text-brand-900">{totalQuestions(f)}</p>
              <p className="text-xs text-slate-500">{t("questions")}</p>
            </div>
            <div className="card p-3">
              <p className="font-display text-2xl font-bold text-brand-900">{f.durationMin}</p>
              <p className="text-xs text-slate-500">{t("minutes")}</p>
            </div>
            <div className="card p-3">
              <p className="font-display text-2xl font-bold text-brand-900">{left > 0 ? left : `₹${EXTRA_TEST_PRICE}`}</p>
              <p className="text-xs text-slate-500">{left > 0 ? t("attempts_left") : t("next_test_49")}</p>
            </div>
          </div>

          <ul className="card space-y-3">
            {inst.map((k) => (
              <li key={k} className="flex gap-3 text-slate-700">
                <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent-500" aria-hidden />
                {t(k)}
              </li>
            ))}
          </ul>

          {left > 0 ? (
            <StartButton lang={lang} sections={f.sections} fav={fav} />
          ) : (
            <div className="rounded-xl border border-accent-500 bg-white p-5 md:p-6">
              <p className="text-sm font-semibold text-slate-500">{t("no_attempts_left")}</p>
              <h2 className="mt-1 text-2xl">{t("extra_test_t")}</h2>
              <p className="mt-1 text-slate-600">{t("extra_test_d")}</p>
              <div className="mt-4">
                <StartButton lang={lang} pay demo={!paymentsEnabled()} sections={f.sections} fav={fav} />
              </div>
              <Link href="/dashboard" className="mt-3 inline-block text-sm font-semibold text-brand-700 underline underline-offset-4">
                {t("go_dashboard")}
              </Link>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
