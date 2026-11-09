"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { t } from "@/lib/i18n";
import { payWithRazorpay } from "@/lib/checkout";
import type { Lang } from "@/lib/types";

/** Books a seat (Razorpay, or free in demo mode) and opens the masterclass page. */
export default function McBookButton({ id, price, lang, demo, full = false }: { id: string; price: number; lang: Lang; demo: boolean; full?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function book() {
    setBusy(true);
    setError("");
    const r = await fetch("/api/masterclass/enroll", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id }) })
      .then((r) => r.json())
      .catch(() => null);
    if (r?.error === "session") return router.push("/login?next=/masterclass");
    if (!r?.ok) {
      setBusy(false);
      return setError(r?.error || t(lang, "error_generic"));
    }
    if (r.pay) {
      const p = await payWithRazorpay(r.pay);
      if (!p.ok) {
        setBusy(false);
        return setError(p.cancelled ? "" : p.error);
      }
    }
    router.push("/masterclass");
    router.refresh();
  }
  return (
    <div className={full ? "w-full" : ""}>
      {error && <p className="error mb-2">{error}</p>}
      <button onClick={book} disabled={busy} className={`btn-accent ${full ? "w-full" : "w-full sm:w-auto"}`}>
        {busy ? t(lang, "loading") : `${t(lang, "mc_book")} ₹${price}`}
      </button>
      {demo && <p className="mt-2 text-xs text-slate-500">{t(lang, "mc_demo")}</p>}
    </div>
  );
}
