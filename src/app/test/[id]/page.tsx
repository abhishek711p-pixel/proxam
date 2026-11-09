import { redirect } from "next/navigation";
import TestRunner from "./TestRunner";
import { currentUser } from "@/lib/auth";
import { getLang } from "@/lib/lang";
import { SYNC_EVERY_SEC } from "@/lib/config";

export default async function TestPage({ params }: { params: Promise<{ id: string }> }) {
  const [user, lang, { id }] = await Promise.all([currentUser(), getLang(), params]);
  if (!user) redirect("/login");
  return <TestRunner attemptId={id} lang={lang} syncEverySec={SYNC_EVERY_SEC} />;
}
