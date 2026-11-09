import type { User } from "./types";
import { activeEnrollments, currentEnrollment } from "./batches";

/** The batch the student is working in now (the one they picked if they have several). */
export function activeEnrollment(user: User) {
  return currentEnrollment(user);
}

export { activeEnrollments };

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
