import type { NextConfig } from "next";

// Logged-in and private pages: never show in Google, even if someone links to them.
const PRIVATE = ["/admin/:path*", "/dashboard/:path*", "/test/:path*", "/result/:path*", "/onboarding", "/notifications", "/book-call", "/login", "/api/:path*"];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      ...PRIVATE.map((source) => ({ source, headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] })),
    ];
  },
};

export default nextConfig;
