import { createOtp, isValidEmail, normEmail } from "@/lib/auth";
import { body, fail, ok } from "@/lib/http";

export async function POST(req: Request) {
  const b = await body(req);
  const email = normEmail(b.email);
  if (!isValidEmail(email)) return fail("Enter a valid email address.");
  const r = await createOtp("login", email);
  if (!r.ok) return fail(r.error, 429);
  return ok({ devOtp: r.devOtp });
}
