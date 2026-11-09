import { requireAttempt } from "@/lib/guard";
import { body, ok } from "@/lib/http";
import { cleanAnswers, cleanTimes, isExpired, submitAttempt } from "@/lib/testEngine";

// Final submit: scoring happens here on the server, answer key never reaches the browser.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await requireAttempt((await params).id);
  if ("res" in g) return g.res;
  const a = { ...g.attempt };
  if (a.status === "submitted") return ok({ next: `/result/${a.id}` });

  const late = isExpired(a);
  if (!late) {
    // Within time (plus grace): accept the latest answers from the browser.
    const b = await body(req);
    a.answers = await cleanAnswers(a, b.answers);
    a.timeSpent = cleanTimes(a, b.timeSpent);
  }
  // If late, only answers that reached the server in time are counted. A second submit does nothing.
  await submitAttempt(a, late);
  return ok({ next: `/result/${a.id}` });
}
