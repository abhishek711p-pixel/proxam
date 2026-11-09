"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

/** For a student in several batches: make this batch the one the dashboard shows, then go there. */
export default function OpenBatchButton({ id, label }: { id: string; label: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      className="btn mt-5 w-full bg-white text-brand-800"
      onClick={async () => {
        setBusy(true);
        const r = await fetch("/api/batch/switch", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id }) })
          .then((x) => x.json())
          .catch(() => null);
        if (r?.ok) router.push("/dashboard");
        else setBusy(false);
      }}
    >
      {label}
    </button>
  );
}
