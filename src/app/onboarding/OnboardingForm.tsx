"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { t } from "@/lib/i18n";
import Select from "@/components/Select";
import type { Lang, Profile } from "@/lib/types";

type FieldOpt = { id: string; stream: string; classes: string[]; label: string; goals: string };

function Choice({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`min-h-12 rounded-xl border px-2 text-base font-semibold transition ${
        active ? "border-brand-600 bg-brand-50 text-brand-700 ring-2 ring-brand-100" : "border-slate-300 bg-white text-slate-700"
      }`}
    >
      {children}
    </button>
  );
}

export default function OnboardingForm({
  lang,
  fields,
  boards,
  goals,
  initial,
  initialMobile = "",
  next,
}: {
  lang: Lang;
  fields: FieldOpt[];
  boards: string[];
  goals: string[];
  initial?: Profile;
  initialMobile?: string;
  next?: string;
}) {
  const router = useRouter();
  const [f, setF] = useState({
    name: initial?.name || "",
    cls: initial?.cls || "",
    stream: initial?.stream && initial.stream !== "foundation" ? initial.stream : "",
    field: initial?.field || "",
    school: initial?.school || "",
    city: initial?.city || "",
    board: initial?.board || "",
    targetGoal: initial?.targetGoal || "",
    language: initial?.language || lang,
    mobile: initialMobile,
  });
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }));

  const fieldOptions = useMemo(() => {
    if (!f.cls) return [];
    if (f.cls === "10") return fields.filter((x) => x.classes.includes("10"));
    if (!f.stream) return [];
    return fields.filter((x) => x.classes.includes(f.cls) && x.stream === f.stream);
  }, [f.cls, f.stream, fields]);

  function pickClass(c: string) {
    setF((p) => ({ ...p, cls: c, stream: c === "10" ? "" : p.stream, field: c === "10" ? "foundation10" : p.cls === "10" ? "" : p.field }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!f.name || !f.cls || !f.field || !f.school || !f.city || !f.board || !f.targetGoal) return setError(t(lang, "required"));
    if (!/^[6-9]\d{9}$/.test(f.mobile)) return setError(t(lang, "invalid_mobile"));
    if (!consent) return setError(t(lang, "consent_needed"));
    setBusy(true);
    const r = await fetch("/api/profile", { method: "POST", body: JSON.stringify({ ...f, consent }) })
      .then((r) => r.json())
      .catch(() => null);
    if (!r?.ok) {
      setBusy(false);
      return setError(r?.error || t(lang, "error_generic"));
    }
    router.replace(next || r.next);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">{t(lang, "ob_title")}</h1>
        <p className="mt-1 text-slate-600">{t(lang, "ob_sub")}</p>
      </div>

      <div className="card space-y-5">
        <div>
          <label className="label" htmlFor="name">{t(lang, "name")} *</label>
          <input id="name" className="input" value={f.name} onChange={(e) => set("name", e.target.value)} autoComplete="name" />
        </div>

        <div>
          <span className="label">{t(lang, "class")} *</span>
          <div className="grid grid-cols-4 gap-2">
            {["10", "11", "12", "dropper"].map((c) => (
              <Choice key={c} active={f.cls === c} onClick={() => pickClass(c)}>
                {c === "dropper" ? t(lang, "dropper") : c}
              </Choice>
            ))}
          </div>
          {f.cls === "dropper" && <p className="mt-1.5 text-xs text-slate-500">{t(lang, "dropper_help")}</p>}
        </div>

        {(f.cls === "11" || f.cls === "12" || f.cls === "dropper") && (
          <div>
            <span className="label">{t(lang, "stream")} *</span>
            <div className="grid grid-cols-2 gap-2">
              <Choice active={f.stream === "science"} onClick={() => setF((p) => ({ ...p, stream: "science", field: "" }))}>
                {t(lang, "science")}
              </Choice>
              <Choice active={f.stream === "commerce"} onClick={() => setF((p) => ({ ...p, stream: "commerce", field: "" }))}>
                {t(lang, "commerce")}
              </Choice>
            </div>
          </div>
        )}

        {fieldOptions.length > 0 && (
          <div>
            <span className="label">{t(lang, "field")} *</span>
            <div className="grid gap-2 md:grid-cols-2">
              {fieldOptions.map((x) => (
                <button
                  type="button"
                  key={x.id}
                  onClick={() => set("field", x.id)}
                  aria-pressed={f.field === x.id}
                  className={`rounded-xl border p-3 text-left transition ${
                    f.field === x.id ? "border-brand-600 bg-brand-50 ring-2 ring-brand-100" : "border-slate-300 bg-white"
                  }`}
                >
                  <span className="block font-semibold">{x.label}</span>
                  <span className="mt-0.5 block text-xs text-slate-500">{x.goals}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="card grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <label className="label" htmlFor="school">{t(lang, "school")} *</label>
          <input id="school" className="input" value={f.school} onChange={(e) => set("school", e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="city">{t(lang, "city")} *</label>
          <input id="city" className="input" value={f.city} onChange={(e) => set("city", e.target.value)} autoComplete="address-level2" />
        </div>
        <div>
          <label className="label" htmlFor="board">{t(lang, "board")} *</label>
          <Select id="board" value={f.board} onChange={(v) => set("board", v)} placeholder={t(lang, "select")} options={boards.map((b) => ({ value: b, label: b }))} />
        </div>
        <div>
          <label className="label" htmlFor="goal">{t(lang, "target_goal")} *</label>
          <Select id="goal" value={f.targetGoal} onChange={(v) => set("targetGoal", v)} placeholder={t(lang, "select")} options={goals.map((g) => ({ value: g, label: g }))} />
        </div>
        <div>
          <label className="label" htmlFor="lang">{t(lang, "pref_lang")}</label>
          <Select
            id="lang"
            value={f.language}
            onChange={(v) => set("language", v)}
            options={[
              { value: "en", label: "English" },
              { value: "hi", label: "हिंदी" },
            ]}
          />
        </div>
        <div className="md:col-span-2">
          <label className="label" htmlFor="mobile">{t(lang, "mobile_req")}</label>
          <div className="flex gap-2">
            <span className="flex min-h-12 shrink-0 items-center rounded-xl border border-slate-300 bg-slate-50 px-3 text-slate-500">+91</span>
            <input
              id="mobile"
              className="input"
              inputMode="numeric"
              autoComplete="tel-national"
              maxLength={10}
              placeholder="98XXXXXXXX"
              value={f.mobile}
              onChange={(e) => set("mobile", e.target.value.replace(/\D/g, ""))}
            />
          </div>
        </div>
      </div>

      <div className="card">
        <label className="flex items-start gap-3 rounded-xl bg-slate-50 p-3">
          <input type="checkbox" className="mt-1 h-5 w-5 shrink-0 accent-brand-600" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
          <span className="text-sm text-slate-700">
            {t(lang, "consent_student")}{" "}
            <Link href="/privacy" target="_blank" className="font-semibold text-brand-600 underline">
              {t(lang, "read_privacy")}
            </Link>
          </span>
        </label>
      </div>

      {error && <p className="error">{error}</p>}
      <button className="btn-primary w-full md:w-auto" disabled={busy}>
        {busy ? t(lang, "loading") : t(lang, "save_continue")} →
      </button>
    </form>
  );
}
