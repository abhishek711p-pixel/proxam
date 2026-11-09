"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ReplyForm({ id }: { id: string }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [by, setBy] = useState(() => (typeof window !== "undefined" && localStorage.getItem("mentorName")) || "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  async function send(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    try {
      localStorage.setItem("mentorName", by);
    } catch {}
    const r = await fetch(`/api/admin/doubts/${id}`, { method: "POST", body: JSON.stringify({ text, by: by || "Mentor" }) })
      .then((r) => r.json())
      .catch(() => null);
    setBusy(false);
    if (!r?.ok) return setMsg(r?.error || "Could not send.");
    setText("");
    router.refresh();
  }
  return (
    <form onSubmit={send} className="mt-3 grid gap-2">
      <textarea className="input min-h-24 py-3" placeholder="Write the explanation the student will see" value={text} onChange={(e) => setText(e.target.value)} />
      <div className="flex flex-wrap items-center gap-2">
        <input className="input max-w-56" placeholder="Reply as (e.g. Priya, Physics mentor)" value={by} onChange={(e) => setBy(e.target.value)} />
        <button className="btn-primary btn-sm" disabled={busy}>
          {busy ? "Sending..." : "Send reply"}
        </button>
        {msg && <span className="text-sm text-accent-700">{msg}</span>}
      </div>
    </form>
  );
}
