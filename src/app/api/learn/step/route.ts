import { after } from "next/server";
import { body, fail, ok } from "@/lib/http";
import { stepExists } from "@/lib/learn";
import { batchStudent } from "@/lib/learnGuard";
import { refreshProgress } from "@/lib/progress";
import { getTask, setStepDone } from "@/lib/store";

/** Mark a roadmap step done or not done. */
export async function POST(req: Request) {
  const s = await batchStudent();
  if (!s) return fail("session", 401);
  const { id, done } = (await body(req)) as { id?: string; done?: boolean };
  const task = id?.startsWith("task:") ? await getTask(id.slice(5)) : undefined;
  if (!id || !stepExists(s.u, id, task ? [task] : [])) return fail("Unknown topic.");
  await setStepDone(s.u.id, id, Boolean(done));
  after(() => refreshProgress([s.u.id])); // after the reply, so ticking feels instant
  return ok();
}
