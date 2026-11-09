import { isAdmin } from "@/lib/auth";
import { nowISO } from "@/lib/ids";
import { body, fail, ok } from "@/lib/http";
import { addDoubtMessage, getDoubt } from "@/lib/store";

/** Mentor reply (from the admin panel). */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return fail("Unauthorised", 401);
  const { id } = await params;
  if (!(await getDoubt(id))) return fail("Not found", 404);
  const x = (await body(req)) as { text?: string; by?: string };
  const text = (x.text || "").trim();
  if (text.length < 2) return fail("Write a reply.");
  await addDoubtMessage(id, { from: "mentor", by: (x.by || "Mentor").trim().slice(0, 60), text: text.slice(0, 3000), at: nowISO() }, { status: "answered", unreadForStudent: true });
  return ok();
}
