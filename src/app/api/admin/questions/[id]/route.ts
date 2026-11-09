import { isAdmin } from "@/lib/auth";
import { allQuestions, saveQuestions } from "@/lib/store";
import { body, fail, ok } from "@/lib/http";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return fail("Unauthorised", 401);
  const { id } = await params;
  const found = (await allQuestions()).find((x) => x.id === id);
  const q = found && { ...found };
  if (!q) return fail("Not found", 404);
  const b = await body(req);
  if (typeof b.active === "boolean") q.active = b.active;
  await saveQuestions([q]);
  return ok();
}
