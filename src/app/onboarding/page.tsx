import { redirect } from "next/navigation";
import Header from "@/components/Header";
import OnboardingForm from "./OnboardingForm";
import { pageUser } from "@/lib/pageUser";
import { getLang } from "@/lib/lang";
import { userAttempts } from "@/lib/store";
import { BOARDS, FIELDS, TARGET_GOALS } from "@/lib/config";
import { safeNext } from "@/lib/safeNext";

export default async function Onboarding({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const [user, lang, sp] = await Promise.all([pageUser(), getLang(), searchParams]);
  const next = safeNext(sp.next);
  if (!user) redirect("/login");
  const hasAttempts = (await userAttempts(user.id)).length > 0;
  // Field can't change after a test is taken (results are tied to the field).
  if (user.profile && hasAttempts) redirect(next || "/dashboard");

  const fields = Object.values(FIELDS).map((f) => ({ id: f.id, stream: f.stream, classes: f.classes, label: f.label[lang], goals: f.goals }));
  return (
    <>
      <Header />
      <main className="container-x py-6 md:py-12">
        <div className="mx-auto max-w-xl">
          <OnboardingForm lang={lang} fields={fields} boards={BOARDS} goals={TARGET_GOALS} initial={user.profile} initialMobile={user.mobile} next={next} />
        </div>
      </main>
    </>
  );
}
