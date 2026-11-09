import { FIELDS } from "@/lib/config";
import { requireAttempt } from "@/lib/guard";
import { ok } from "@/lib/http";
import { isExpired, publicQuestions, submitAttempt } from "@/lib/testEngine";

// One call when the test opens: questions (no answer key) + saved progress.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await requireAttempt((await params).id);
  if ("res" in g) return g.res;
  let a = g.attempt;
  if (a.status === "in_progress" && isExpired(a)) a = await submitAttempt(a, true);
  return ok({
    status: a.status,
    field: FIELDS[a.field].label,
    expiresAt: a.expiresAt,
    serverNow: new Date().toISOString(),
    questions: a.status === "in_progress" ? await publicQuestions(a) : [],
    answers: a.answers,
    marked: a.marked,
    timeSpent: a.timeSpent,
  });
}
