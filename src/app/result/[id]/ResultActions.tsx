"use client";
import { t } from "@/lib/i18n";
import type { Lang } from "@/lib/types";

export default function ResultActions({ lang, shareText }: { lang: Lang; shareText: string }) {
  return (
    <div className="no-print grid grid-cols-2 gap-2">
      <button className="btn-ghost" onClick={() => window.print()}>
        ⬇ {t(lang, "download_pdf")}
      </button>
      <button
        className="btn-ghost"
        onClick={async () => {
          if (navigator.share) {
            try {
              await navigator.share({ text: shareText });
            } catch {}
          } else {
            await navigator.clipboard?.writeText(shareText);
            alert("Copied");
          }
        }}
      >
        ↗ {t(lang, "share")}
      </button>
    </div>
  );
}
