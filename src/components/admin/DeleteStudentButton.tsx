"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

export default function DeleteStudentButton({
  id,
  name,
  redirectOnDelete,
  label = "Delete",
}: {
  id: string;
  name: string;
  redirectOnDelete?: string;
  label?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    const ok = window.confirm(
      `Are you sure you want to delete lead "${name}"?\n\nThis will permanently delete this student along with all their test attempts, call bookings, and progress data.`
    );
    if (!ok) return;

    setBusy(true);
    try {
      const res = await fetch(`/api/admin/students/${id}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        alert(data?.error || "Could not delete student lead. Please try again.");
      } else {
        if (redirectOnDelete) {
          router.push(redirectOnDelete);
        } else {
          router.refresh();
        }
      }
    } catch (err) {
      alert("Network error: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      disabled={busy}
      onClick={handleDelete}
      title={`Delete lead ${name}`}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg text-rose-700 bg-rose-50 hover:bg-rose-100 hover:text-rose-800 border border-rose-200/80 transition-all disabled:opacity-50 cursor-pointer"
    >
      <Trash2 size={13} className="shrink-0 text-rose-600" />
      <span>{busy ? "Deleting..." : label}</span>
    </button>
  );
}

