import { after } from "next/server";
import { isAdmin } from "@/lib/auth";
import { batchUserIds } from "@/lib/adminData";
import { body, fail, ok } from "@/lib/http";
import { refreshProgress } from "@/lib/progress";
import { grantTestToBatch, markBatchProgressStale, setEnrollmentStart } from "@/lib/store";

/** Change every student of one batch (class + stream) at once. */
export async function POST(req: Request) {
  if (!(await isAdmin())) return fail("Unauthorised", 401);
  const x = (await body(req)) as { cls?: string; field?: string; action?: string; date?: string };
  if (!x.cls || !x.field) return fail("Pick a batch.");
  if (x.action === "grantTest") {
    const n = await grantTestToBatch(x.cls, x.field);
    if (!n) return fail("No students in this batch.");
    return ok({ count: n });
  }
  if (x.action === "start") {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(x.date || "")) return fail("Pick a date.");
    const ids = await batchUserIds(x.cls, x.field);
    if (!ids.length) return fail("No students in this batch.");
    await setEnrollmentStart(ids, new Date(`${x.date}T09:00:00+05:30`).toISOString(), { cls: x.cls, field: x.field });
    await markBatchProgressStale(x.cls, x.field);
    after(() => refreshProgress(ids.slice(0, 300))); // the rest by the hourly job
    return ok({ count: ids.length });
  }
  return fail("Unknown action.");
}
