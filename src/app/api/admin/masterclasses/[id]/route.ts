import { isAdmin } from "@/lib/auth";
import { allMasterclasses, masterclassHasSeats, saveMasterclass } from "@/lib/store";
import { body, fail, ok } from "@/lib/http";
import { readMasterclassForm } from "@/lib/masterclassAdmin";

/** Edit a masterclass, or cancel / reopen it with { status }. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return fail("Unauthorised", 401);
  const { id } = await params;
  const found = (await allMasterclasses()).find((x) => x.id === id);
  if (!found) return fail("Not found", 404);
  const m = { ...found };
  if (!m) return fail("Not found", 404);
  const x = await body(req);
  if (x.status === "cancelled" || x.status === "scheduled") {
    m.status = x.status;
  } else {
    const r = readMasterclassForm(x);
    if ("error" in r) return fail(r.error);
    if ((r.data.cls !== m.cls || r.data.field !== m.field) && (await masterclassHasSeats(m.id)))
      return fail("Students have booked this one, so the class and stream cannot change. Create a new masterclass instead.");
    Object.assign(m, r.data);
    if (!r.data.field) m.field = undefined;
    if (!r.data.meetingLink) m.meetingLink = undefined;
  }
  await saveMasterclass(m);
  return ok();
}
