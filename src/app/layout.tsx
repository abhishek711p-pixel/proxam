import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { BRAND } from "@/lib/config";
import { SITE_DESC, SITE_TITLE, SITE_URL } from "@/lib/site";

// Self-hosted fonts: no request to Google, small files, Hindi files load only when Hindi text is on the page.
const display = localFont({ src: "./fonts/bricolage-grotesque-latin-wght-normal.woff2", weight: "200 800", variable: "--f-display", display: "swap" });
const body = localFont({
  src: [
    { path: "./fonts/mukta-latin-400-normal.woff2", weight: "400" },
    { path: "./fonts/mukta-latin-600-normal.woff2", weight: "600" },
    { path: "./fonts/mukta-latin-700-normal.woff2", weight: "700" },
  ],
  variable: "--f-body",
  display: "swap",
});
const bodyHi = localFont({
  src: [
    { path: "./fonts/mukta-devanagari-400-normal.woff2", weight: "400" },
    { path: "./fonts/mukta-devanagari-600-normal.woff2", weight: "600" },
    { path: "./fonts/mukta-devanagari-700-normal.woff2", weight: "700" },
  ],
  variable: "--f-body-hi",
  display: "swap",
  preload: false,
});
const hand = localFont({
  src: [{ path: "./fonts/kalam-latin-700-normal.woff2", weight: "700" }],
  variable: "--f-hand",
  display: "swap",
});
const handHi = localFont({
  src: [{ path: "./fonts/kalam-devanagari-700-normal.woff2", weight: "700" }],
  variable: "--f-hand-hi",
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: SITE_TITLE, template: `%s | ${BRAND}` },
  description: SITE_DESC,
  applicationName: BRAND,
  manifest: "/manifest.webmanifest",
  keywords: [
    "free mock test",
    "JEE practice test",
    "NEET practice test",
    "class 10 stream selection test",
    "career guidance after 10th",
    "CUET commerce test",
    "class 11 test",
    "class 12 test",
    "dropper batch",
    "online test with instant result",
  ],
  openGraph: { type: "website", siteName: BRAND, locale: "en_IN", url: SITE_URL, title: SITE_TITLE, description: SITE_DESC },
  twitter: { card: "summary_large_image", title: SITE_TITLE, description: SITE_DESC },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 } },
  // Paste the code from Google Search Console (HTML tag method) into GOOGLE_SITE_VERIFICATION
  verification: process.env.GOOGLE_SITE_VERIFICATION ? { google: process.env.GOOGLE_SITE_VERIFICATION } : undefined,
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f7f4ec",
};

// Static on purpose (no cookies here): public pages can then be served from the CDN.
// Pages set the real language on <html> themselves (see HtmlLang).
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${bodyHi.variable} ${hand.variable} ${handHi.variable}`}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
