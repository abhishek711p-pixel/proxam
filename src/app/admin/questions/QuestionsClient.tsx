"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function ImportForm() {
  const router = useRouter();
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <section className="card space-y-3">
      <h2 className="font-bold">Bulk upload (CSV)</h2>
      <p className="text-sm text-slate-600">
        Fill the template in Excel or Google Sheets, then save as CSV. Part A/B need <code>answer</code> (a to d). Part C (Career Fit) needs <code>tags</code> like <code>tech|health|business|people</code>.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <a href="/api/admin/questions/template" className="btn-ghost btn-sm">⬇ Download template</a>
        <label className="btn-primary btn-sm cursor-pointer">
          {busy ? "Uploading…" : "⬆ Upload CSV"}
          <input
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setBusy(true);
              setMsg("");
              const csv = await file.text();
              const r = await fetch("/api/admin/questions/import", { method: "POST", body: JSON.stringify({ csv }) }).then((r) => r.json());
              setBusy(false);
              e.target.value = "";
              setMsg(r.ok ? `Added ${r.added} questions ✓` : r.error);
              if (r.ok) router.refresh();
            }}
          />
        </label>
      </div>
      {msg && <pre className="whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm">{msg}</pre>}
    </section>
  );
}

export function ToggleActive({ id, active }: { id: string; active: boolean }) {
  const router = useRouter();
  return (
    <button
      className="btn-ghost btn-sm"
      onClick={async () => {
        await fetch(`/api/admin/questions/${id}`, { method: "PATCH", body: JSON.stringify({ active: !active }) });
        router.refresh();
      }}
    >
      {active ? "Disable" : "Enable"}
    </button>
  );
}
