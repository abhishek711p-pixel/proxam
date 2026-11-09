"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import McAdminForm, { type McFormValues } from "./McAdminForm";

export default function McRowActions({ id, status, hasLink, googleOn, initial }: { id: string; status: string; hasLink: boolean; googleOn: boolean; initial: McFormValues }) {
  const router = useRouter();
  const [edit, setEdit] = useState(false);
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");

  async function call(kind: "meet" | "cancel" | "reopen") {
    if (kind === "cancel" && !confirm("Cancel this masterclass? Students who booked will see it as cancelled.")) return;
    setBusy(kind);
    setMsg("");
    const r =
      kind === "meet"
        ? await fetch(`/api/admin/masterclasses/${id}/meet`, { method: "POST" }).then((r) => r.json()).catch(() => null)
        : await fetch(`/api/admin/masterclasses/${id}`, { method: "PATCH", body: JSON.stringify({ status: kind === "cancel" ? "cancelled" : "scheduled" }) })
            .then((r) => r.json())
            .catch(() => null);
    setBusy("");
    if (!r?.ok) return setMsg(r?.error || "Something went wrong.");
    router.refresh();
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <button className="btn-ghost btn-sm" onClick={() => setEdit(!edit)}>
          {edit ? "Close" : "Edit date, time, details"}
        </button>
        {!hasLink && status === "scheduled" && (
          <button className="btn-ghost btn-sm" onClick={() => call("meet")} disabled={!googleOn || busy !== ""} title={googleOn ? "" : "Connect Google Calendar first"}>
            {busy === "meet" ? "Creating..." : "Create Google Meet link"}
          </button>
        )}
        {status === "scheduled" ? (
          <button className="btn-ghost btn-sm text-accent-700" onClick={() => call("cancel")} disabled={busy !== ""}>
            Cancel masterclass
          </button>
        ) : (
          <button className="btn-ghost btn-sm" onClick={() => call("reopen")} disabled={busy !== ""}>
            Reopen
          </button>
        )}
      </div>
      {msg && <p className="error mt-2">{msg}</p>}
      {edit && (
        <div className="mt-4 rounded-lg border border-slate-300 bg-slate-50 p-4">
          <McAdminForm id={id} initial={initial} onDone={() => setEdit(false)} />
        </div>
      )}
    </div>
  );
}
