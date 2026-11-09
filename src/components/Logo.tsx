import Link from "next/link";
import { BRAND } from "@/lib/config";

export default function Logo({ dark = false }: { dark?: boolean }) {
  return (
    <Link href="/" className={`flex items-center gap-2 font-display font-bold tracking-tight ${dark ? "text-white" : "text-brand-900"}`}>
      <svg width="28" height="28" viewBox="0 0 32 32" aria-hidden>
        <rect width="32" height="32" rx="7" fill={dark ? "#fff" : "#3a4a2f"} />
        <path d="M8 21a8 8 0 0 1 16 0" fill="none" stroke={dark ? "#3a4a2f" : "#fff"} strokeWidth="3" strokeLinecap="round" />
        <path d="M16 21l4-6" stroke="#cc5500" strokeWidth="3" strokeLinecap="round" />
      </svg>
      <span className="text-lg">{BRAND}</span>
    </Link>
  );
}
