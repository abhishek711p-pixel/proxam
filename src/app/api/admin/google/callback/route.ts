import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isAdmin } from "@/lib/auth";
import { oauthFinish } from "@/lib/integrations/google";

// Step 2: Google sends the admin back here with a one-time code.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const back = new URL("/admin/calendar", req.url);
  const jar = await cookies();
  const expected = jar.get("g_state")?.value;
  jar.delete("g_state");

  if (!(await isAdmin())) return NextResponse.redirect(new URL("/admin", req.url));
  if (url.searchParams.get("error")) {
    back.searchParams.set("google", "denied");
    return NextResponse.redirect(back);
  }
  const code = url.searchParams.get("code");
  if (!code || !expected || url.searchParams.get("state") !== expected) {
    back.searchParams.set("google", "failed");
    back.searchParams.set("msg", "Security check failed. Please try again.");
    return NextResponse.redirect(back);
  }
  try {
    await oauthFinish(code);
    back.searchParams.set("google", "connected");
  } catch (e) {
    back.searchParams.set("google", "failed");
    back.searchParams.set("msg", e instanceof Error ? e.message : String(e));
  }
  return NextResponse.redirect(back);
}
