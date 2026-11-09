import { adminLogin, adminPasswordProblem } from "@/lib/auth";
import { body, fail, ok, str } from "@/lib/http";

export async function POST(req: Request) {
  const b = await body(req);
  const problem = adminPasswordProblem();
  if (problem) return fail(problem, 503);
  if (!(await adminLogin(str(b.password, 200)))) return fail("Wrong password.", 401);
  return ok();
}
