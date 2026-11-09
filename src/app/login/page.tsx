import { redirect } from "next/navigation";
import Header from "@/components/Header";
import LoginForm from "./LoginForm";
import { pageUser } from "@/lib/pageUser";
import { getLang } from "@/lib/lang";
import { safeNext } from "@/lib/safeNext";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ reason?: string; next?: string }> }) {
  const [user, lang, sp] = await Promise.all([pageUser(), getLang(), searchParams]);
  const next = safeNext(sp.next);
  if (user) redirect(user.profile ? next || "/dashboard" : `/onboarding${next ? `?next=${encodeURIComponent(next)}` : ""}`);
  return (
    <>
      <Header />
      <main className="container-x py-8 md:py-16">
        <div className="mx-auto max-w-md">
          <LoginForm lang={lang} reason={sp.reason} next={next} />
        </div>
      </main>
    </>
  );
}
