import { currentUser } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
import { startOrResumeAttempt } from "@/lib/testEngine";

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return fail("session", 401);
  const body = (await req.json().catch(() => ({}))) as { favSubject?: unknown };
  const favSubject = typeof body.favSubject === "string" ? body.favSubject.slice(0, 60) : undefined;
  const r = await startOrResumeAttempt(user, { favSubject });
  if ("error" in r) return fail(r.error!);
  return ok({ attemptId: r.attempt!.id });
}
