import { body, fail, ok } from "@/lib/http";
import { checkpointChapterTitles, checkpointOpen, planOf } from "@/lib/learn";
import { batchStudent } from "@/lib/learnGuard";
import { startOrResumeAttempt } from "@/lib/testEngine";

/** Start the 14-day checkpoint test. It does not use a free attempt. */
export async function POST(req: Request) {
  const s = await batchStudent();
  if (!s) return fail("session", 401);
  const { no } = (await body(req)) as { no?: number };
  const n = Number(no);
  if (!Number.isInteger(n) || n < 1) return fail("Unknown test.");
  const db = await s.scope();
  if (!checkpointOpen(s.u, s.enr, n, planOf(db, s.u))) return fail("This test opens on its date.");
  // questions come first from the chapters in this test's syllabus (set by the mentor, or automatic)
  const r = await startOrResumeAttempt(s.u, { checkpointNo: n, chapters: checkpointChapterTitles(db, s.u, s.enr, n) });
  if ("error" in r) return fail(r.error!);
  return ok({ attemptId: r.attempt!.id });
}
