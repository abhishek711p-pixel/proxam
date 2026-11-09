import "server-only";
import { sessionUserId } from "./auth";
import { fail } from "./http";
import { getAttempt } from "./store";

/** The caller's own test attempt (two light queries: the session and the attempt). */
export async function requireAttempt(id: string) {
  const userId = await sessionUserId();
  if (!userId) return { res: fail("session", 401) } as const;
  const attempt = await getAttempt(id);
  if (!attempt || attempt.userId !== userId) return { res: fail("Test not found.", 404) } as const;
  return { userId, attempt } as const;
}
