import crypto from "crypto";
import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { oauthConfigured, oauthStartUrl } from "@/lib/integrations/google";

// Step 1 of "Connect Google Calendar": send the admin to Google's sign-in page.
export async function GET(req: Request) {
  const back = new URL("/admin/calendar", req.url);
  if (!(await isAdmin())) return NextResponse.redirect(new URL("/admin", req.url));
  if (!oauthConfigured()) {
    back.searchParams.set("google", "missing_keys");
    return NextResponse.redirect(back);
  }
  const state = crypto.randomBytes(16).toString("base64url");
  const res = NextResponse.redirect(oauthStartUrl(state));
  res.cookies.set("g_state", state, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 600 });
  return res;
}
