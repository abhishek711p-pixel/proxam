import "server-only";

// ------------------------------------------------------------------
// Zoom: creates a meeting for "Zoom" bookings.
// Uses a Zoom Server-to-Server OAuth app (Zoom Marketplace > Develop >
// Build app > Server-to-Server OAuth) with scope meeting:write:admin
// (or meeting:write:meeting:admin on newer apps).
// Note: a free Zoom account ends meetings after 40 minutes. Our calls are 20 to 30.
// ------------------------------------------------------------------

export function zoomEnabled() {
  return Boolean(process.env.ZOOM_ACCOUNT_ID && process.env.ZOOM_CLIENT_ID && process.env.ZOOM_CLIENT_SECRET);
}

let cached: { token: string; exp: number } | null = null;

async function accessToken() {
  if (cached && cached.exp > Date.now() + 60_000) return cached.token;
  const basic = Buffer.from(`${process.env.ZOOM_CLIENT_ID}:${process.env.ZOOM_CLIENT_SECRET}`).toString("base64");
  const res = await fetch(
    `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${encodeURIComponent(process.env.ZOOM_ACCOUNT_ID!)}`,
    { method: "POST", headers: { authorization: `Basic ${basic}` }, signal: AbortSignal.timeout(10_000) },
  );
  const data = (await res.json()) as { access_token?: string; expires_in?: number; reason?: string };
  if (!res.ok || !data.access_token) throw new Error(`Zoom auth failed: ${data.reason || res.status}`);
  cached = { token: data.access_token, exp: Date.now() + (data.expires_in || 3600) * 1000 };
  return cached.token;
}

export async function createZoomMeeting(opts: { topic: string; start: string; minutes: number }) {
  const token = await accessToken();
  const user = process.env.ZOOM_HOST_EMAIL || "me";
  const res = await fetch(`https://api.zoom.us/v2/users/${encodeURIComponent(user)}/meetings`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({
      topic: opts.topic,
      type: 2, // scheduled
      start_time: new Date(opts.start).toISOString(),
      duration: opts.minutes,
      timezone: "Asia/Kolkata",
      settings: { join_before_host: false, waiting_room: true },
    }),
    signal: AbortSignal.timeout(15_000),
  });
  const data = (await res.json()) as { id?: number; join_url?: string; message?: string };
  if (!res.ok || !data.join_url) throw new Error(`Zoom: ${data.message || res.status}`);
  return { meetingId: String(data.id), joinUrl: data.join_url };
}

export async function deleteZoomMeeting(meetingId: string) {
  const token = await accessToken();
  const res = await fetch(`https://api.zoom.us/v2/meetings/${encodeURIComponent(meetingId)}`, {
    method: "DELETE",
    headers: { authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok && res.status !== 404) throw new Error(`Zoom delete: ${res.status}`);
}
