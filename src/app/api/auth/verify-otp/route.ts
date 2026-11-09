import { checkOtp, isValidEmail, normEmail, startSession } from "@/lib/auth";
import { body, fail, ok, str } from "@/lib/http";

export async function POST(req: Request) {
  const b = await body(req);
  const email = normEmail(b.email);
  const code = str(b.code, 6);
  if (!isValidEmail(email) || !/^\d{6}$/.test(code)) return fail("Enter the 6-digit OTP.");
  const r = await checkOtp("login", email, code);
  if (!r.ok) return fail(r.error!);
  const user = await startSession(email);
  return ok({ next: user.profile && user.mobile ? "/dashboard" : "/onboarding" });
}
