import "server-only";
import { learnSummary } from "./learn";
import { saveProgress, scopeFor, staleProgressIds } from "./store";

/**
 * Admin lists sort and filter by roadmap progress. Working that out needs the whole roadmap,
 * which is too slow to do for lakhs of students on every page load, so it is saved on the student:
 * right after anything that changes it, and refreshed daily by the cron job (being "behind" changes with the date).
 */
export async function refreshProgress(userIds: string[]) {
  if (!userIds.length) return;
  const db = await scopeFor(userIds);
  for (const u of db.users) {
    const sm = learnSummary(db, u);
    if (sm) await saveProgress(u.id, sm.pct, sm.overdue, sm.lastDone);
  }
}

/** Cron: recompute the oldest saved progress, in chunks. */
export async function refreshStaleProgress(max = 2000) {
  let done = 0;
  while (done < max) {
    const ids = await staleProgressIds(100);
    if (!ids.length) break;
    await refreshProgress(ids);
    done += ids.length;
  }
  return done;
}
