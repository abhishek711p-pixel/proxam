import { isAdmin } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
import { deleteNotice } from "@/lib/store";

/** Take back a notification (students stop seeing it). */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return fail("Unauthorised", 401);
  const { id } = await params;
  if (!(await deleteNotice(id))) return fail("Not found", 404);
  return ok();
}
