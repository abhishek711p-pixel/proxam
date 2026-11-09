import { sessionUserId } from "@/lib/auth";
import { SUBMIT_GRACE_SEC } from "@/lib/config";
import { body, fail, ok } from "@/lib/http";
import { getAttempt, saveAnswers } from "@/lib/store";
import { cleanAnswersFast, isExpired } from "@/lib/testEngine";

// Batched autosave: the browser sends all answers every ~30 seconds (not on every tap).
// Built for crowds: usually one database query (the session check is cached, the attempt is not read first).
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await sessionUserId();
  if (!userId) return fail("session", 401);
  const { id } = await params;
  const b = await body(req);
  const times: Record<string, number> = {};
  if (b.timeSpent && typeof b.timeSpent === "object")
    for (const [qid, t] of Object.entries(b.timeSpent as Record<string, unknown>).slice(0, 200)) if (typeof t === "number" && t >= 0 && t < 36000) times[qid] = Math.round(t);
  const lastSyncAt = new Date().toISOString();
  const saved = await saveAnswers(userId, id, SUBMIT_GRACE_SEC, {
    answers: await cleanAnswersFast(b.answers),
    marked: Array.isArray(b.marked) ? b.marked.filter((q): q is string => typeof q === "string").slice(0, 200) : undefined,
    timeSpent: times,
    lastSyncAt,
  });
  if (saved) return ok({ savedAt: lastSyncAt });
  // Not saved: find out why (rare, so the extra read is fine).
  const a = await getAttempt(id);
  if (!a || a.userId !== userId) return fail("Test not found.", 404);
  if (a.status !== "in_progress") return fail("already_submitted", 409);
  if (isExpired(a)) return fail("time_up", 409);
  return fail("Could not save. Please try again.", 500);
}
