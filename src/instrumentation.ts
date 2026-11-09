// Runs once when the server starts: begins the SMS reminder loop (checks every minute).
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  if (!process.env.DATABASE_URL) return;
  const { startReminderLoop } = await import("./lib/bookingHooks");
  startReminderLoop();
}
