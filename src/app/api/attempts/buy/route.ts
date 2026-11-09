import { currentUser } from "@/lib/auth";
import { paymentsEnabled } from "@/lib/batch";
import { EXTRA_TEST_PRICE } from "@/lib/config";
import { newId, nowISO } from "@/lib/ids";
import { addTestPurchase, hit, userAttempts } from "@/lib/store";
import { fail, ok } from "@/lib/http";
import { attemptsLeft } from "@/lib/testEngine";

/** Buy one more test (₹49) after the free attempts are used. */
export async function POST() {
  const user = await currentUser();
  if (!user) return fail("session", 401);
  if (!user.profile) return fail("Please complete your profile first.");

  // Never charge twice: if a test is still available, use that one.
  if (attemptsLeft(user, await userAttempts(user.id)) > 0) return ok({ bought: false });
  if (!(await hit(`buy:${user.id}`, 5, 60_000))) return fail("Please wait a moment and try again.");

  if (paymentsEnabled()) {
    // TODO (Phase 2): create a Razorpay order for EXTRA_TEST_PRICE, open Checkout,
    // verify the signature in a webhook, and only then add the purchase below with mode "razorpay".
    return fail("Online payment is not connected yet.");
  }

  // Demo mode: no gateway configured, add the test without charging.
  await addTestPurchase(user.id, { id: newId("tp_"), amount: EXTRA_TEST_PRICE, paidAt: nowISO(), mode: "demo" });
  return ok({ bought: true });
}
