"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function AdminLogin() {
  const router = useRouter();
  const [pw, setPw] = useState("");
  const [error, setError] = useState("");
  return (
    <form
      className="card w-full max-w-sm space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        const r = await fetch("/api/admin/login", { method: "POST", body: JSON.stringify({ password: pw }) }).then((r) => r.json());
        if (!r.ok) return setError(r.error);
        router.refresh();
      }}
    >
      <h1 className="text-xl font-bold">Admin login</h1>
      <input className="input" type="password" placeholder="Password" value={pw} onChange={(e) => setPw(e.target.value)} autoFocus />
      {error && <p className="error">{error}</p>}
      <button className="btn-primary w-full">Log in</button>
    </form>
  );
}

export function AdminLogout() {
  const router = useRouter();
  return (
    <button
      className="btn-ghost btn-sm"
      onClick={async () => {
        await fetch("/api/admin/logout", { method: "POST" });
        router.refresh();
      }}
    >
      Log out
    </button>
  );
}
