import { NextResponse, type NextRequest } from "next/server";

// The home page is built twice (English at /, Hindi at /hi) and served from the CDN.
// Someone who picked Hindi earlier gets the Hindi build at the same address.
export function proxy(req: NextRequest) {
  if (req.cookies.get("lang")?.value === "hi") return NextResponse.rewrite(new URL("/hi", req.url));
  return NextResponse.next();
}

export const config = { matcher: "/" };
