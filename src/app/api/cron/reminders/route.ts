import { runReminders } from "@/lib/bookingHooks";
import { fail, ok } from "@/lib/http";
import { refreshStaleProgress } from "@/lib/progress";
import { cleanupShortLived } from "@/lib/store";
import { finalizeExpired } from "@/lib/testEngine";

// Background jobs. Call this URL every 5 minutes (Vercel Cron, cron-job.org...)
// with header "Authorization: Bearer <CRON_SECRET>".
// Every job is safe to run on several servers at once.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return fail("Unauthorised", 401);
  const sent = await runReminders();
  const autoSubmitted = await finalizeExpired(); // tests left open after the timer
  const progress = await refreshStaleProgress(1000); // admin list numbers, a chunk at a time
  if (new Date().getUTCMinutes() < 5) await cleanupShortLived(); // once an hour
  return ok({ sent, autoSubmitted, progress });
}
