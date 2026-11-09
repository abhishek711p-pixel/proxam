"use client";
import { useRouter } from "next/navigation";

export default function DeleteNotice({ id }: { id: string }) {
  const router = useRouter();
  return (
    <button
      className="text-xs font-semibold text-accent-700 underline"
      onClick={async () => {
        if (!confirm("Take this notification back? Students will stop seeing it.")) return;
        await fetch(`/api/admin/notifications/${id}`, { method: "DELETE" });
        router.refresh();
      }}
    >
      Take back
    </button>
  );
}
