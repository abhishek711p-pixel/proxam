import "server-only";
import crypto from "crypto";
import { nowISO } from "../ids";
import { getSetting, setSetting } from "../store";

type GoogleSetting = { refreshTokenEnc: string; email?: string; connectedAt: string; error?: string };
// Read on every booking; kept for a short while so a rush of bookings is one query, not thousands.
const gs = globalThis as unknown as { __googleSetting?: { at: number; v: GoogleSetting | undefined } };
async function googleSetting() {
  const c = gs.__googleSetting;
  if (c && Date.now() - c.at < 30_000) return c.v;
  const v = await getSetting<GoogleSetting>("google");
  gs.__googleSetting = { at: Date.now(), v };
  return v;
}
async function saveGoogleSetting(v: GoogleSetting | undefined) {
  await setSetting("google", v);
  gs.__googleSetting = { at: Date.now(), v };
}
import { open, seal } from "../secretBox";

// ------------------------------------------------------------------
// Google Calendar + Meet. Two ways to connect:
//
// 1. "Connect Google Calendar" button (Admin > Calendar). Works with a
//    normal Gmail account. You sign in once; we keep a refresh token
//    (encrypted) and create events with Meet links on YOUR calendar.
//    Needs GOOGLE_OAUTH_CLIENT_ID + GOOGLE_OAUTH_CLIENT_SECRET.
//
// 2. Service account (Google Workspace only, for Meet links).
//    Needs GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY,
//    GOOGLE_CALENDAR_ID and GOOGLE_IMPERSONATE_USER.
//
// If both are set, the connected account (1) is used.
// ------------------------------------------------------------------

export const OAUTH_SCOPES = ["openid", "email", "https://www.googleapis.com/auth/calendar.events"];

export function oauthConfigured() {
  return Boolean(process.env.GOOGLE_OAUTH_CLIENT_ID && process.env.GOOGLE_OAUTH_CLIENT_SECRET);
}
function serviceConfigured() {
  return Boolean(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY && process.env.GOOGLE_CALENDAR_ID);
}
export function oauthRedirectUri() {
  return `${(process.env.SITE_URL || "http://localhost:3000").replace(/\/$/, "")}/api/admin/google/callback`;
}

type Mode = "oauth" | "service";
export async function googleMode(): Promise<Mode | null> {
  const g = await googleSetting();
  if (oauthConfigured() && g?.refreshTokenEnc && !g.error) return "oauth";
  if (serviceConfigured()) return "service";
  return null;
}

export async function googleStatus() {
  const g = await googleSetting();
  const mode = await googleMode();
  return {
    mode,
    connected: Boolean(mode),
    email: mode === "oauth" ? g?.email : mode === "service" ? process.env.GOOGLE_IMPERSONATE_USER || process.env.GOOGLE_CALENDAR_ID : undefined,
    canConnect: oauthConfigured(),
    error: g?.error,
  };
}

const b64url = (b: Buffer | string) => Buffer.from(b).toString("base64url");
const cache: Partial<Record<Mode, { token: string; exp: number }>> = {};

// ---------- OAuth (Connect button) ----------

export function oauthStartUrl(state: string) {
  const q = new URLSearchParams({
    client_id: process.env.GOOGLE_OAUTH_CLIENT_ID!,
    redirect_uri: oauthRedirectUri(),
    response_type: "code",
    scope: OAUTH_SCOPES.join(" "),
    access_type: "offline", // gives a refresh token so it keeps working
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${q}`;
}

/** Exchanges the code from Google's redirect and saves the (encrypted) refresh token. */
export async function oauthFinish(code: string) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_OAUTH_CLIENT_ID!,
      client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET!,
      redirect_uri: oauthRedirectUri(),
      grant_type: "authorization_code",
    }),
    signal: AbortSignal.timeout(15_000),
  });
  const data = (await res.json()) as { refresh_token?: string; access_token?: string; expires_in?: number; id_token?: string; scope?: string; error_description?: string };
  if (!res.ok || !data.access_token) throw new Error(data.error_description || `Google token error ${res.status}`);
  if (!data.refresh_token) throw new Error("Google did not return a refresh token. Remove the app at myaccount.google.com/permissions and connect again.");
  if (!data.scope?.includes("calendar")) throw new Error("Calendar permission was not given. Connect again and tick the calendar box.");
  let email: string | undefined;
  try {
    email = JSON.parse(Buffer.from((data.id_token || "").split(".")[1] || "", "base64url").toString()).email;
  } catch {}
  await saveGoogleSetting({ refreshTokenEnc: seal(data.refresh_token), email, connectedAt: nowISO() });
  cache.oauth = { token: data.access_token, exp: Date.now() + (data.expires_in || 3600) * 1000 };
  return email;
}

export async function oauthDisconnect() {
  const g = await googleSetting();
  if (g?.refreshTokenEnc) {
    try {
      await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(open(g.refreshTokenEnc))}`, {
        method: "POST",
        signal: AbortSignal.timeout(10_000),
      });
    } catch {}
  }
  await saveGoogleSetting(undefined);
  delete cache.oauth;
}

async function oauthToken() {
  const g = await googleSetting();
  if (!g) throw new Error("Google Calendar is not connected");
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_OAUTH_CLIENT_ID!,
      client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET!,
      refresh_token: open(g.refreshTokenEnc),
      grant_type: "refresh_token",
    }),
    signal: AbortSignal.timeout(10_000),
  });
  const data = (await res.json()) as { access_token?: string; expires_in?: number; error?: string; error_description?: string };
  if (!res.ok || !data.access_token) {
    if (data.error === "invalid_grant") {
      // Access was removed or expired: show "reconnect" in admin.
      await saveGoogleSetting({ ...g, error: "Google access expired or was removed. Please connect again." });
    }
    throw new Error(`Google auth failed: ${data.error_description || data.error || res.status}`);
  }
  return { token: data.access_token, exp: Date.now() + (data.expires_in || 3600) * 1000 };
}

// ---------- Service account (Workspace) ----------

async function serviceToken() {
  const iat = Math.floor(Date.now() / 1000);
  const claims: Record<string, unknown> = {
    iss: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    scope: "https://www.googleapis.com/auth/calendar",
    aud: "https://oauth2.googleapis.com/token",
    iat,
    exp: iat + 3600,
  };
  if (process.env.GOOGLE_IMPERSONATE_USER) claims.sub = process.env.GOOGLE_IMPERSONATE_USER;
  const unsigned = `${b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }))}.${b64url(JSON.stringify(claims))}`;
  const key = (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n");
  const sig = crypto.createSign("RSA-SHA256").update(unsigned).sign(key);
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${unsigned}.${b64url(sig)}` }),
    signal: AbortSignal.timeout(10_000),
  });
  const data = (await res.json()) as { access_token?: string; expires_in?: number; error_description?: string };
  if (!res.ok || !data.access_token) throw new Error(`Google auth failed: ${data.error_description || res.status}`);
  return { token: data.access_token, exp: Date.now() + (data.expires_in || 3600) * 1000 };
}

async function accessToken(mode: Mode) {
  const c = cache[mode];
  if (c && c.exp > Date.now() + 60_000) return c.token;
  const fresh = mode === "oauth" ? await oauthToken() : await serviceToken();
  cache[mode] = fresh;
  return fresh.token;
}

function calUrl(mode: Mode) {
  const id = mode === "oauth" ? process.env.GOOGLE_CALENDAR_ID || "primary" : process.env.GOOGLE_CALENDAR_ID!;
  return `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(id)}/events`;
}

// ---------- Events ----------

export async function createCalendarEvent(opts: {
  requestId: string;
  title: string;
  description: string;
  start: string;
  minutes: number;
  withMeet: boolean;
  location?: string;
}): Promise<{ eventId: string; meetLink?: string }> {
  const mode = await googleMode();
  if (!mode) throw new Error("Google Calendar is not connected");
  const token = await accessToken(mode);
  const end = new Date(new Date(opts.start).getTime() + opts.minutes * 60_000).toISOString();
  const event: Record<string, unknown> = {
    summary: opts.title,
    description: opts.description,
    start: { dateTime: new Date(opts.start).toISOString(), timeZone: "Asia/Kolkata" },
    end: { dateTime: end, timeZone: "Asia/Kolkata" },
    location: opts.location,
    reminders: { useDefault: false, overrides: [{ method: "popup", minutes: 10 }] },
  };
  if (opts.withMeet) {
    event.conferenceData = { createRequest: { requestId: opts.requestId, conferenceSolutionKey: { type: "hangoutsMeet" } } };
  }
  const res = await fetch(`${calUrl(mode)}?conferenceDataVersion=1`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(event),
    signal: AbortSignal.timeout(15_000),
  });
  const data = (await res.json()) as {
    id?: string;
    hangoutLink?: string;
    conferenceData?: { entryPoints?: { entryPointType?: string; uri?: string }[] };
    error?: { message?: string };
  };
  if (!res.ok || !data.id) throw new Error(`Google Calendar: ${data.error?.message || res.status}`);
  const meet = data.hangoutLink || data.conferenceData?.entryPoints?.find((e) => e.entryPointType === "video")?.uri;
  return { eventId: data.id, meetLink: meet };
}

export async function deleteCalendarEvent(eventId: string) {
  const mode = await googleMode();
  if (!mode) return;
  const token = await accessToken(mode);
  const res = await fetch(`${calUrl(mode)}/${encodeURIComponent(eventId)}`, {
    method: "DELETE",
    headers: { authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok && res.status !== 404 && res.status !== 410) throw new Error(`Google Calendar delete: ${res.status}`);
}
