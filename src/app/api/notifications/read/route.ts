import { sessionUserId } from "@/lib/auth";
import { body, fail, ok } from "@/lib/http";
import { markNoticesRead } from "@/lib/store";

/** Student marks notifications as seen. */
export async function POST(req: Request) {
  const userId = await sessionUserId();
  if (!userId) return fail("Log in first.", 401);
  const { ids } = (await body(req)) as { ids?: string[] };
  if (!Array.isArray(ids)) return fail("Nothing to mark.");
  await markNoticesRead(userId, ids.filter((x) => typeof x === "string"));
  return ok();
}
