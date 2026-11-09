"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { t } from "@/lib/i18n";
import type { Lang } from "@/lib/types";
import OtpInput from "@/components/OtpInput";

export default function LoginForm({ lang, reason, next }: { lang: Lang; reason?: string; next?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [step, setStep] = useState<"email" | "otp">("email");
  const [code, setCode] = useState("");
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [error, setError] = useState(reason === "elsewhere" ? t(lang, "logged_out_elsewhere") : "");
  const [busy, setBusy] = useState(false);

  async function sendOtp(e?: React.FormEvent) {
    e?.preventDefault();
    setError("");
    const clean = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(clean)) return setError(t(lang, "invalid_email"));
    setEmail(clean);
    setBusy(true);
    const r = await fetch("/api/auth/send-otp", { method: "POST", body: JSON.stringify({ email: clean }) }).then((r) => r.json()).catch(() => null);
    setBusy(false);
    if (!r?.ok) return setError(r?.error || t(lang, "error_generic"));
    setDevOtp(r.devOtp || null);
    setStep("otp");
  }

  async function verify(e?: React.FormEvent) {
    e?.preventDefault();
    setError("");
    setBusy(true);
    const r = await fetch("/api/auth/verify-otp", { method: "POST", body: JSON.stringify({ email, code }) }).then((r) => r.json()).catch(() => null);
    if (!r?.ok) {
      setBusy(false);
      return setError(r?.error || t(lang, "error_generic"));
    }
    if (next) router.replace(r.next === "/dashboard" ? next : `/onboarding?next=${encodeURIComponent(next)}`);
    else router.replace(r.next);
    router.refresh();
  }

  return (
    <div className="card">
      <h1 className="text-2xl font-bold">{t(lang, "login_title")}</h1>
      <p className="mt-1 text-slate-600">{t(lang, "login_sub")}</p>

      {step === "email" ? (
        <form onSubmit={sendOtp} className="mt-6 space-y-4">
          <div>
            <label className="label" htmlFor="email">{t(lang, "email")}</label>
            <input
              id="email"
              type="email"
              className="input"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              maxLength={120}
              placeholder="you@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
            />
          </div>
          {error && <p className="error">{error}</p>}
          <button className="btn-primary w-full" disabled={busy || !email.includes("@")}>
            {busy ? t(lang, "loading") : t(lang, "send_otp")}
          </button>
        </form>
      ) : (
        <form onSubmit={verify} className="mt-6 space-y-4">
          <p className="text-sm text-slate-600">
            {t(lang, "otp_sent_to")} <b className="break-all">{email}</b>{" "}
            <button type="button" className="font-semibold text-brand-600" onClick={() => { setStep("email"); setCode(""); }}>
              {t(lang, "change_email")}
            </button>
          </p>
          {!devOtp && <p className="text-xs text-slate-500">{t(lang, "check_spam")}</p>}
          {devOtp && (
            <p className="rounded-xl bg-accent-50 px-4 py-3 text-sm text-accent-800">
              {t(lang, "dev_otp")} <b className="tracking-widest">{devOtp}</b>
            </p>
          )}
          <div>
            <label className="label">{t(lang, "enter_otp")}</label>
            <OtpInput value={code} onChange={setCode} />
          </div>
          {error && <p className="error">{error}</p>}
          <button className="btn-primary w-full" disabled={busy || code.length !== 6}>
            {busy ? t(lang, "loading") : t(lang, "verify")}
          </button>
          <button type="button" className="w-full text-sm font-semibold text-brand-600" onClick={() => sendOtp()}>
            {t(lang, "send_otp")} ↻
          </button>
        </form>
      )}
    </div>
  );
}
