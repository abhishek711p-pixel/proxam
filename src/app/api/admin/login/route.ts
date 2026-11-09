import { adminLogin } from "@/lib/auth";
import { body, fail, ok, str } from "@/lib/http";

export async function POST(req: Request) {
  const b = await body(req);
  if (!(await adminLogin(str(b.password, 200)))) return fail("Wrong password.", 401);
  return ok();
}
