import { ImageResponse } from "next/og";
import { BRAND } from "@/lib/config";
import { MARK_COLORS, MARK_VIEWBOX, markPaths, WORD_PATH, WORD_VIEWBOX } from "@/components/BrandMark";

// The picture shown when the site link is shared on WhatsApp, LinkedIn, X etc. Built once at deploy time.
export const alt = `${BRAND}: free test and career guidance for Class 10, 11, 12`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#f4f5ef", padding: 72 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
          <svg width={74} height={90} viewBox={MARK_VIEWBOX}>
            {markPaths()}
          </svg>
          <svg width={(44 * 3596) / 753} height={44} viewBox={WORD_VIEWBOX} style={{ marginTop: 8 }}>
            <path d={WORD_PATH} fill={MARK_COLORS.dark} />
          </svg>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 72, fontWeight: 800, color: "#1b3728", lineHeight: 1.05 }}>Free test. Instant result.</div>
          <div style={{ fontSize: 72, fontWeight: 800, color: "#cc5500", lineHeight: 1.05 }}>Know where you stand.</div>
          <div style={{ fontSize: 34, color: "#4a5544", marginTop: 28 }}>Class 10, 11, 12 and droppers · JEE · NEET · CUET · Stream guidance</div>
        </div>
      </div>
    ),
    size,
  );
}
