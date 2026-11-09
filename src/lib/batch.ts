import type { User } from "./types";

export function activeEnrollment(user: User) {
  const now = Date.now();
  return (user.enrollments || []).find((e) => !e.expiresAt || new Date(e.expiresAt).getTime() > now);
}

export function paymentsEnabled() {
  return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

/**
 * Demo mode (enrol without charging) only on a local/dev server with no Razorpay keys.
 * On the live site without keys, buying is closed instead, so nobody gets a batch for free.
 */
export function demoPayments() {
  const live = process.env.NODE_ENV === "production" && process.env.ALLOW_DEV_OTP !== "1";
  return !paymentsEnabled() && !live;
}
