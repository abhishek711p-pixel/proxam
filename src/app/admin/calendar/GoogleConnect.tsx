"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function DisconnectGoogle() {
  const router = useRouter();
  const [ask, setAsk] = useState(false);
  if (!ask)
    return (
      <button className="btn-ghost btn-sm" onClick={() => setAsk(true)}>
        Disconnect
      </button>
    );
  return (
    <span className="flex items-center gap-2 text-xs">
      Stop adding calls to this calendar?
      <button
        className="btn btn-sm bg-rose-600 text-white"
        onClick={async () => {
          await fetch("/api/admin/google/disconnect", { method: "POST" });
          router.refresh();
        }}
      >
        Yes
      </button>
      <button className="btn-ghost btn-sm" onClick={() => setAsk(false)}>
        No
      </button>
    </span>
  );
}
