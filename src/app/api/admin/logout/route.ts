import { adminLogout } from "@/lib/auth";
import { ok } from "@/lib/http";

export async function POST() {
  await adminLogout();
  return ok();
}
