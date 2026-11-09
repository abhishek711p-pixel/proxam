import { isAdmin } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
import { oauthDisconnect } from "@/lib/integrations/google";

export async function POST() {
  if (!(await isAdmin())) return fail("Unauthorised", 401);
  await oauthDisconnect();
  return ok();
}
