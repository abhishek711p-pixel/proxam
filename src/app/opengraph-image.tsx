import { ImageResponse } from "next/og";
import { BRAND } from "@/lib/config";

// The picture shown when the site link is shared on WhatsApp, LinkedIn, X etc. Built once at deploy time.
export const alt = `${BRAND}: free test and career guidance for Class 10, 11, 12`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#f7f4ec", padding: 72 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ width: 72, height: 72, borderRadius: 16, background: "#3a4a2f", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="52" height="52" viewBox="0 0 32 32">
              <path d="M8 21a8 8 0 0 1 16 0" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
              <path d="M16 21l4-6" stroke="#cc5500" strokeWidth="3" strokeLinecap="round" />
            </svg>
          </div>
          <div style={{ fontSize: 48, fontWeight: 800, color: "#2a3622" }}>{BRAND}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 72, fontWeight: 800, color: "#2a3622", lineHeight: 1.05 }}>Free test. Instant result.</div>
          <div style={{ fontSize: 72, fontWeight: 800, color: "#cc5500", lineHeight: 1.05 }}>Know where you stand.</div>
          <div style={{ fontSize: 34, color: "#4a5544", marginTop: 28 }}>Class 10, 11, 12 and droppers · JEE · NEET · CUET · Stream guidance</div>
        </div>
      </div>
    ),
    size,
  );
}
