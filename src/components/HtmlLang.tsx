"use client";
import { useEffect } from "react";
import type { Lang } from "@/lib/types";

/** The root layout is static (fast, cacheable), so the page language is set on <html> here. */
export default function HtmlLang({ lang }: { lang: Lang }) {
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  return null;
}
