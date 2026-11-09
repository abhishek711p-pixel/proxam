"use client";

export default function OtpInput({ value, onChange, id }: { value: string; onChange: (v: string) => void; id?: string }) {
  return (
    <input
      id={id}
      className="input text-center text-2xl font-bold tracking-[0.5em]"
      inputMode="numeric"
      autoComplete="one-time-code"
      maxLength={6}
      placeholder="••••••"
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 6))}
      autoFocus
    />
  );
}
