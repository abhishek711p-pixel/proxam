import { currentUser } from "@/lib/auth";
import { activeEnrollments } from "@/lib/batch";
import { body, fail, ok, str } from "@/lib/http";
import { setCurrentBatch } from "@/lib/store";

/** Student with several batches picks which one the dashboard shows. */
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return fail("session", 401);
  const id = str((await body(req)).id, 40);
  if (!activeEnrollments(user).some((e) => e.id === id)) return fail("You are not in this batch.");
  await setCurrentBatch(user.id, id);
  return ok({ next: "/dashboard" });
}
