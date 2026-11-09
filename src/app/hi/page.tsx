import type { Metadata } from "next";
import Landing from "@/components/Landing";
import { SITE_DESC_HI, SITE_TITLE_HI } from "@/lib/site";

// Hindi home page: its own address so Google can show it for Hindi searches.
export const metadata: Metadata = {
  title: { absolute: SITE_TITLE_HI },
  description: SITE_DESC_HI,
  alternates: { canonical: "/hi", languages: { "en-IN": "/", "hi-IN": "/hi", "x-default": "/" } },
  openGraph: { locale: "hi_IN", title: SITE_TITLE_HI, description: SITE_DESC_HI, url: "/hi" },
};

export default function HomeHi() {
  return <Landing lang="hi" />;
}
