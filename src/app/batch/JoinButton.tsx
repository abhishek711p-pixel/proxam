"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { t } from "@/lib/i18n";
import { payWithRazorpay } from "@/lib/checkout";
import type { Lang } from "@/lib/types";

export default function JoinButton({ lang, demo, price, batch, compact = false }: { lang: Lang; demo: boolean; price: number; batch: string; compact?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function pay() {
    setBusy(true);
    setError("");
    const r = await fetch("/api/batch/enroll", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ batch }) }).then((r) => r.json()).catch(() => null);
    if (r?.error === "session") return router.replace("/login?next=/batch");
    if (!r?.ok) {
      setBusy(false);
      return setError(r?.error || t(lang, "error_generic"));
    }
    let next = r.next;
    if (r.pay) {
      const p = await payWithRazorpay(r.pay);
      if (!p.ok) {
        setBusy(false);
        return setError(p.cancelled ? "" : p.error);
      }
      next = p.next;
    }
    router.replace(next);
    router.refresh();
  }
  return (
    <div>
      <button className={`btn-primary w-full ${compact ? "" : "text-lg"}`} onClick={pay} disabled={busy}>
        {busy ? t(lang, "loading") : compact ? t(lang, "pay_now") : `${t(lang, "pay_now")}, ₹${price}`}
      </button>
      {demo && !compact && <p className="mt-2 rounded-lg bg-accent-50 px-3 py-2 text-xs text-accent-800">{t(lang, "demo_pay")}</p>}
      {error && <p className="error mt-2">{error}</p>}
    </div>
  );
}
