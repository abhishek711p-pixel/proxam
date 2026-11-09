import "server-only";
import crypto from "crypto";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { newId } from "./ids";
import { bumpOtpTries, deleteOtp, getOtp, getUser, hit, loginUser, putOtp, sessionOk } from "./store";
import type { User } from "./types";
import { emailEnabled, otpEmail, sendEmail } from "./integrations/email";

const SESSION_COOKIE = "sid";
const LOGGED_IN_HINT = "px_in";
const ADMIN_COOKIE = "adm";
const SESSION_DAYS = 30;

/** Live site (not `npm run dev`). ALLOW_DEV_OTP=1 relaxes the checks for a local `npm start` test. */
const LIVE = process.env.NODE_ENV === "production" && process.env.ALLOW_DEV_OTP !== "1";

function secret() {
  const s = process.env.AUTH_SECRET;
  // Without a real secret anyone could forge a login cookie, so the live site refuses to run without one.
  if (!s && LIVE) throw new Error("AUTH_SECRET is not set. Add a long random value in the hosting settings.");
  return s || "dev-only-secret-change-me";
}

function sign(value: string) {
  return crypto.createHmac("sha256", secret()).update(value).digest("base64url");
}

function safeEqual(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

export function hash(value: string) {
  return crypto.createHash("sha256").update(value + secret()).digest("hex");
}

export function isValidMobile(m: string) {
  return /^[6-9]\d{9}$/.test(m);
}

// ---------- OTP (by email) ----------

export function normEmail(e: unknown) {
  return typeof e === "string" ? e.trim().toLowerCase().slice(0, 120) : "";
}

export function isValidEmail(e: string) {
  return e.length <= 120 && /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(e);
}

/** Creates an OTP and emails it. Returns the code only in dev mode (no email provider set up). */
export async function createOtp(purpose: "login", email: string) {
  const key = `${purpose}:${email}`;
  const now = Date.now();
  const existing = await getOtp(key);
  if (existing && now - existing.sentAt < 30_000) {
    return { ok: false as const, error: "Please wait 30 seconds before asking for a new OTP." };
  }
  // Limits shared by all servers: free email quotas are small and bots love OTP forms.
  const ip = await clientIp();
  // Per email: 6 an hour. Per IP: generous, because a whole school or coaching centre can share one IP.
  const ipLimit = Number(process.env.OTP_IP_LIMIT || 300);
  if (!(await hit(`otp:e:${email}`, 6, 3600_000)) || !(await hit(`otp:ip:${ip}`, ipLimit, 3600_000))) {
    return { ok: false as const, error: "Too many OTP requests. Please try again in an hour." };
  }
  const code = String(crypto.randomInt(100000, 1000000));
  await putOtp({ key, hash: hash(code), expiresAt: now + 5 * 60_000, tries: 0, sentAt: now });

  // Live site without an email service: never show the code on screen (anyone could log into any account).
  if (!emailEnabled() && LIVE) {
    await deleteOtp(key);
    return { ok: false as const, error: "Login by email is not set up yet. Please try again later." };
  }
  if (emailEnabled()) {
    const r = await sendEmail({ to: email, ...otpEmail(code) });
    if (!r.ok) {
      await deleteOtp(key); // let the student try again at once
      return { ok: false as const, error: "Could not send the OTP email. Please check the address and try again." };
    }
    return { ok: true as const };
  }
  return { ok: true as const, devOtp: code };
}

export async function checkOtp(purpose: "login", email: string, code: string) {
  const key = `${purpose}:${email}`;
  const otp = await getOtp(key);
  if (!otp || otp.expiresAt < Date.now()) return { ok: false, error: "OTP expired. Please request a new one." };
  if (otp.tries >= 5) return { ok: false, error: "Too many wrong tries. Please request a new OTP." };
  if (!safeEqual(otp.hash, hash(code))) {
    await bumpOtpTries(key);
    return { ok: false, error: "Wrong OTP." };
  }
  await deleteOtp(key);
  return { ok: true };
}

/** Best guess of the visitor's IP (behind Vercel / a proxy). */
async function clientIp() {
  const h = await headers();
  return (h.get("x-forwarded-for") || "").split(",")[0].trim() || h.get("x-real-ip") || "unknown";
}

// ---------- Student session (one active session per student) ----------

export async function startSession(email: string): Promise<User> {
  const sessionId = newId();
  const user = await loginUser(email, sessionId); // also logs out any other device
  const value = `${user.id}.${sessionId}`;
  (await cookies()).set(SESSION_COOKIE, `${value}.${sign(value)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 86400,
  });
  // Not secret: only tells the static public pages (home, guides) to show "Dashboard" instead of "Login".
  (await cookies()).set(LOGGED_IN_HINT, "1", { sameSite: "lax", path: "/", maxAge: SESSION_DAYS * 86400 });
  return user;
}

/** The logged-in student, read once per request (the header and the page share it). */
export const currentUser = cache(async (): Promise<User | null> => {
  const raw = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  const parts = raw.split(".");
  if (parts.length !== 3) return null;
  const [userId, sessionId, sig] = parts;
  if (!safeEqual(sig, sign(`${userId}.${sessionId}`))) return null;
  const user = await getUser(userId);
  if (!user || user.activeSessionId !== sessionId) return null;
  return user;
});

// Sessions checked in the last 30 seconds, so autosave (every student, every 30 s) does not hit the database for it.
// Trade-off: after logging in on a new phone, the old phone keeps saving for up to 30 seconds.
const gs = globalThis as unknown as { __sessionOk?: Map<string, number> };
const okSessions = (gs.__sessionOk ??= new Map());

/** Cheap check for hot API routes that only need to know who is calling. */
export async function sessionUserId(): Promise<string | null> {
  const raw = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  const [userId, sessionId, sig] = raw.split(".");
  if (!sig || !safeEqual(sig, sign(`${userId}.${sessionId}`))) return null;
  const key = `${userId}.${sessionId}`;
  const seen = okSessions.get(key);
  if (seen && Date.now() - seen < 30_000) return userId;
  if (!(await sessionOk(userId, sessionId))) return null;
  if (okSessions.size > 100_000) okSessions.clear();
  okSessions.set(key, Date.now());
  return userId;
}

export async function endSession() {
  (await cookies()).delete(SESSION_COOKIE);
  (await cookies()).delete(LOGGED_IN_HINT);
}

// ---------- Admin ----------

function adminPassword() {
  return process.env.ADMIN_PASSWORD || "admin123";
}

/** On the live site the admin password must be set and strong; otherwise admin login stays closed. */
export function adminPasswordProblem() {
  const p = process.env.ADMIN_PASSWORD || "";
  if (LIVE && (p.length < 10 || p === "admin123")) return "Admin login is closed: set a strong ADMIN_PASSWORD (10+ characters) in the hosting settings.";
  return undefined;
}

export async function adminLogin(password: string) {
  if (adminPasswordProblem()) return false;
  if (!safeEqual(hash(password), hash(adminPassword()))) return false;
  const value = `admin.${Date.now()}`;
  (await cookies()).set(ADMIN_COOKIE, `${value}.${sign(value)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 12 * 3600,
  });
  return true;
}

export async function isAdmin() {
  const raw = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!raw) return false;
  const i = raw.lastIndexOf(".");
  const value = raw.slice(0, i);
  const sig = raw.slice(i + 1);
  return safeEqual(sig, sign(value));
}

export async function adminLogout() {
  (await cookies()).delete(ADMIN_COOKIE);
}
