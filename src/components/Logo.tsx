import Link from "next/link";
import { BRAND } from "@/lib/config";
import BrandMark, { WORD_PATH, WORD_VIEWBOX, MARK_COLORS } from "./BrandMark";

/** Header logo: mark + lowercase "proxam" wordmark. `dark` = on a dark background (white ink). */
export default function Logo({ dark = false }: { dark?: boolean }) {
  return (
    <Link href="/" aria-label={BRAND} className="flex shrink-0 items-center gap-2">
      <BrandMark size={32} light={dark} />
      <svg height="19" viewBox={WORD_VIEWBOX} width={(19 * 3596) / 753} aria-hidden className="relative top-[2px]">
        <path d={WORD_PATH} fill={dark ? "#ffffff" : MARK_COLORS.dark} />
      </svg>
    </Link>
  );
}
