"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function LogoutButton({ label }: { label: string }) {
  const router = useRouter();
  return (
    <button
      className="btn-ghost btn-sm"
      onClick={async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        router.replace("/");
        router.refresh();
      }}
    >
      {label}
    </button>
  );
}

export function CancelBooking({ id, label, confirmText }: { id: string; label: string; confirmText: string }) {
  const router = useRouter();
  const [ask, setAsk] = useState(false);
  if (!ask)
    return (
      <button className="btn-ghost btn-sm text-accent-700" onClick={() => setAsk(true)}>
        {label}
      </button>
    );
  return (
    <span className="flex items-center gap-2 text-sm">
      {confirmText}
      <button
        className="btn-sm btn bg-accent-600 text-white"
        onClick={async () => {
          await fetch(`/api/bookings/${id}`, { method: "DELETE" });
          router.refresh();
        }}
      >
        ✓
      </button>
      <button className="btn-ghost btn-sm" onClick={() => setAsk(false)}>
        ✕
      </button>
    </span>
  );
}
