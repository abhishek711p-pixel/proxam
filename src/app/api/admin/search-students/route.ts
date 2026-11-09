import { isAdmin } from "@/lib/auth";
import { searchStudents } from "@/lib/adminData";
import { fail, ok } from "@/lib/http";

/** Name or mobile search for pickers (top 8 matches). */
export async function GET(req: Request) {
  if (!(await isAdmin())) return fail("Unauthorised", 401);
  const text = (new URL(req.url).searchParams.get("q") || "").trim().slice(0, 60);
  if (text.length < 2) return ok({ list: [] });
  return ok({ list: await searchStudents(text) });
}
