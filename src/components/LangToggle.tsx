"use client";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import type { Lang } from "@/lib/types";

export default function LangToggle({ lang, dark = false }: { lang: Lang; dark?: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const next: Lang = lang === "en" ? "hi" : "en";
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        document.cookie = `lang=${next}; path=/; max-age=31536000; samesite=lax`;
        start(() => router.refresh());
      }}
      className={`rounded-lg border px-3 py-1.5 text-sm font-semibold ${
        dark ? "border-white/30 text-white hover:bg-white/10" : "border-slate-400 text-brand-900 hover:bg-white"
      }`}
      aria-label="Change language"
    >
      {lang === "en" ? "हिंदी" : "English"}
    </button>
  );
}
