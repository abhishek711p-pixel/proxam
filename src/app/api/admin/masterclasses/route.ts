import { isAdmin } from "@/lib/auth";
import { newId, nowISO } from "@/lib/ids";
import { saveMasterclass } from "@/lib/store";
import { body, fail, ok } from "@/lib/http";
import { readMasterclassForm } from "@/lib/masterclassAdmin";
import type { Masterclass } from "@/lib/types";

export async function POST(req: Request) {
  if (!(await isAdmin())) return fail("Unauthorised", 401);
  const r = readMasterclassForm(await body(req));
  if ("error" in r) return fail(r.error);
  const m = { id: newId("mc_"), status: "scheduled", createdAt: nowISO(), desc: "", ...r.data } as Masterclass;
  await saveMasterclass(m);
  return ok({ id: m.id });
}
