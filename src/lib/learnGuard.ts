import "server-only";
import { currentUser } from "./auth";
import { activeEnrollment } from "./batch";
import { scopeFor } from "./store";

/** The logged-in batch student and their enrolment, or null. `scope()` loads their roadmap data when needed. */
export async function batchStudent() {
  const u = await currentUser();
  if (!u?.profile) return null;
  const enr = activeEnrollment(u);
  if (!enr) return null;
  return { u, enr, scope: () => scopeFor([u.id]) };
}
