import type { User } from "./types";

export function activeEnrollment(user: User) {
  const now = Date.now();
  return (user.enrollments || []).find((e) => !e.expiresAt || new Date(e.expiresAt).getTime() > now);
}

export function paymentsEnabled() {
  return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}
