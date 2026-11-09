"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function BatchActions({ cls, field, count }: { cls: string; field: string; count: number }) {
  const router = useRouter();
  const [date, setDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  async function act(action: string, confirmText: string) {
    if (!confirm(confirmText)) return;
    setBusy(true);
    setMsg("");
    const r = await fetch("/api/admin/batches", { method: "POST", body: JSON.stringify({ cls, field, action, date }) })
      .then((r) => r.json())
      .catch(() => null);
    setBusy(false);
    setMsg(r?.ok ? `Done for ${r.count}.` : r?.error || "Failed.");
    router.refresh();
  }
  return (
    <details className="mt-3 rounded-lg border border-slate-200 p-3 text-sm">
      <summary className="cursor-pointer font-semibold">Change the whole batch</summary>
      <div className="mt-3 flex flex-wrap items-end gap-2">
        <div>
          <label className="label">New plan start date</label>
          <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <button className="btn-ghost btn-sm" disabled={busy || !date} onClick={() => act("start", `Restart the study plan for all ${count} students from ${date}? Their ticked chapters stay.`)}>
          Set start date for all
        </button>
        <button className="btn-ghost btn-sm" disabled={busy} onClick={() => act("grantTest", `Give 1 free extra test to all ${count} students?`)}>
          Give everyone 1 free test
        </button>
        {msg && <span className="text-xs font-semibold text-brand-700">{msg}</span>}
      </div>
    </details>
  );
}
