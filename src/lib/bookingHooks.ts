import "server-only";
import { FIELDS, classLabel } from "./config";
import { nowISO } from "./ids";
import { bookingsNeedingReminders, claimReminders, getAttempt, getUser, saveBooking } from "./store";
import { createCalendarEvent, deleteCalendarEvent, googleMode, googleStatus } from "./integrations/google";
import { createZoomMeeting, deleteZoomMeeting, zoomEnabled } from "./integrations/zoom";
import { notifyStudent } from "./notify";
import { whatsappEnabled } from "./integrations/whatsapp";
import type { Booking, User } from "./types";

// What happens around a guidance call booking:
// 1. Meet or Zoom link is created (if that integration is set up)
// 2. The call is put on the team's Google Calendar (if set up)
// 3. The student gets SMS: confirmation, reminders (24 h, 1 h, 10 min), cancellation

export const CALL_MINUTES = 30;
const REMINDERS: { key: string; minutes: number; label: string }[] = [
  { key: "24h", minutes: 24 * 60, label: "24 hours" },
  { key: "1h", minutes: 60, label: "1 hour" },
  { key: "10m", minutes: 10, label: "10 minutes" },
];

const site = () => (process.env.SITE_URL || "http://localhost:3000").replace(/\/$/, "");

function fmtWhen(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}
const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "numeric", minute: "2-digit" });
const platformName = (b: Booking) => (b.platform === "zoom" ? "Zoom" : "Google Meet");
const linkOrNote = (b: Booking) => b.meetingLink || `${site()}/dashboard (link coming soon)`;
const firstName = (u?: User) => (u?.profile?.name || "there").split(" ")[0];

export async function integrationStatus() {
  return {
    google: await googleStatus(),
    zoom: zoomEnabled(),
    sms: process.env.SMS_PROVIDER === "msg91" && Boolean(process.env.MSG91_AUTH_KEY),
    whatsapp: whatsappEnabled(),
  };
}

/** Called right after a booking is saved. Never throws. */
export async function onBooked(b: Booking, user: User) {
  await createMeetingAndEvent(b, user);

  const when = fmtWhen(b.slotStart);
  await notifyStudent({
    to: user.mobile,
    kind: "booked",
    bookingId: b.id,
    sms: [when, platformName(b), linkOrNote(b)],
    wa: [firstName(user), when, platformName(b), linkOrNote(b)],
    text: `Proxam: Your free guidance call is booked for ${when} on ${platformName(b)}. Join: ${linkOrNote(b)}`,
  });
}

/**
 * Creates the Zoom meeting (Zoom bookings) and the Google Calendar event (+ Meet link for Meet bookings).
 * Skips whatever already exists, so it is safe to run again from Admin ("Create link").
 */
export async function createMeetingAndEvent(b: Booking, user: User) {
  const p = user.profile;
  const errors: string[] = [];
  const title = `Guidance call: ${p?.name || user.mobile} (${p ? `${classLabel(p.cls)}, ${FIELDS[p.field].label.en}` : ""}) · ${platformName(b)}`;
  const attempt = b.attemptId ? await getAttempt(b.attemptId) : undefined;
  const description = [
    `Student: ${p?.name || "-"}`,
    `Mobile: +91 ${user.mobile}`,
    p ? `Class: ${classLabel(p.cls)} · ${FIELDS[p.field].label.en} · ${p.board} · ${p.city}` : "",
    p ? `Goal: ${p.targetGoal}` : "",
    attempt?.result ? `Latest test: ${attempt.result.percentage}% (${attempt.result.level})` : "",
    attempt?.result?.weakTopics.length ? `Weak topics: ${attempt.result.weakTopics.slice(0, 6).join("; ")}` : "",
    `Platform: ${platformName(b)}`,
    `Admin: ${site()}/admin/calls`,
  ]
    .filter(Boolean)
    .join("\n");

  // Zoom link first, so it can go into the calendar event.
  if (b.platform === "zoom" && zoomEnabled() && !b.zoomMeetingId) {
    try {
      const z = await createZoomMeeting({ topic: title, start: b.slotStart, minutes: CALL_MINUTES });
      b.zoomMeetingId = z.meetingId;
      b.meetingLink = z.joinUrl;
      b.linkSource = "zoom";
    } catch (e) {
      errors.push(String(e instanceof Error ? e.message : e));
    }
  }

  if ((await googleMode()) && !b.calendarEventId) {
    try {
      const ev = await createCalendarEvent({
        requestId: b.id,
        title,
        description: b.meetingLink ? `${description}\nJoin: ${b.meetingLink}` : description,
        start: b.slotStart,
        minutes: CALL_MINUTES,
        withMeet: b.platform === "meet",
        location: b.meetingLink,
      });
      b.calendarEventId = ev.eventId;
      if (b.platform === "meet" && ev.meetLink) {
        b.meetingLink = ev.meetLink;
        b.linkSource = "google";
      }
    } catch (e) {
      errors.push(String(e instanceof Error ? e.message : e));
    }
  }

  b.syncError = errors.length ? errors.join(" | ") : undefined;
  b.updatedAt = nowISO();
  await saveBooking(b);
  return errors;
}

/** Message text to share the link by hand (WhatsApp button in Admin > Calls). */
export function linkMessage(b: Booking, name?: string) {
  return `Hi${name ? ` ${name.split(" ")[0]}` : ""}, your free Proxam guidance call is on ${fmtWhen(b.slotStart)} (${platformName(b)}).\nJoin here: ${b.meetingLink}\nPlease join 2 minutes early.`;
}

/** Can students pick Zoom? Only when Zoom is connected, or when nothing is connected (links are added by hand anyway). */
export async function zoomSelectable() {
  return zoomEnabled() || !(await googleMode());
}

/** Removes the calendar event / Zoom meeting and tells the student. Never throws. */
export async function onCancelled(booking: Booking, user: User | undefined, opts: { notify: boolean }) {
  const errors: string[] = [];
  if (booking.calendarEventId && (await googleMode())) {
    try {
      await deleteCalendarEvent(booking.calendarEventId);
      booking.calendarEventId = undefined;
    } catch (e) {
      errors.push(String(e instanceof Error ? e.message : e));
    }
  }
  if (booking.zoomMeetingId && zoomEnabled()) {
    try {
      await deleteZoomMeeting(booking.zoomMeetingId);
      booking.zoomMeetingId = undefined;
    } catch (e) {
      errors.push(String(e instanceof Error ? e.message : e));
    }
  }
  booking.syncError = errors.length ? errors.join(" | ") : booking.syncError;
  await saveBooking(booking);
  if (opts.notify && user) {
    const when = fmtWhen(booking.slotStart);
    await notifyStudent({
      to: user.mobile,
      kind: "cancelled",
      bookingId: booking.id,
      sms: [when, `${site()}/book-call`],
      wa: [firstName(user), when, `${site()}/book-call`],
      text: `Proxam: Your guidance call on ${when} is cancelled. Book a new time: ${site()}/book-call`,
    });
  }
}

/** Admin pasted a link by hand: send it to the student. */
export async function onLinkAdded(booking: Booking, user: User | undefined) {
  if (!user || !booking.meetingLink) return;
  const when = fmtWhen(booking.slotStart);
  await notifyStudent({
    to: user.mobile,
    kind: "link",
    bookingId: booking.id,
    sms: [when, booking.meetingLink],
    wa: [firstName(user), when, booking.meetingLink],
    text: `Proxam: Your guidance call link for ${when}: ${booking.meetingLink}`,
  });
}

/**
 * Sends reminders that are due. Safe to call often (every minute).
 * Each reminder goes once. If the call was booked after a reminder's time
 * (for example booked 3 hours before), that reminder is skipped because the
 * confirmation SMS already covered it. If several are overdue (server was off),
 * only the nearest one is sent.
 */
export async function runReminders(now = Date.now()) {
  let sent = 0;
  const longest = Math.max(...REMINDERS.map((r) => r.minutes)) * 60_000;
  for (const b of await bookingsNeedingReminders(longest + 60_000)) {
    const start = new Date(b.slotStart).getTime();
    if (start <= now) continue;
    const before = b.remindersSent || [];
    const done = new Set(before);
    const due = REMINDERS.filter((r) => !done.has(r.key) && now >= start - r.minutes * 60_000);
    if (!due.length) continue;
    const nearest = due.reduce((a, r) => (r.minutes < a.minutes ? r : a));
    // Several servers may run this at once: only the one that claims the reminder sends it.
    if (!(await claimReminders(b.id, before, [...before, ...due.map((r) => r.key)]))) continue;
    const bookedInTime = new Date(b.createdAt).getTime() <= start - nearest.minutes * 60_000;
    if (!bookedInTime) continue;
    const user = await getUser(b.userId);
    if (!user) continue;
    await notifyStudent({
      to: user.mobile,
      kind: "reminder",
      bookingId: b.id,
      sms: [nearest.label, fmtTime(b.slotStart), linkOrNote(b)],
      wa: [firstName(user), nearest.label, fmtTime(b.slotStart), linkOrNote(b)],
      text: `Reminder: Your Proxam guidance call starts in ${nearest.label} (${fmtTime(b.slotStart)}). Join: ${linkOrNote(b)}`,
    });
    sent++;
  }
  return sent;
}

/** Background loop: checks reminders every minute while the server runs. */
export function startReminderLoop() {
  const g = globalThis as unknown as { __reminderLoop?: NodeJS.Timeout; __reminderBusy?: boolean };
  if (g.__reminderLoop) return;
  const tick = async () => {
    if (g.__reminderBusy) return;
    g.__reminderBusy = true;
    try {
      await runReminders();
    } catch (e) {
      console.error("[reminders]", e);
    } finally {
      g.__reminderBusy = false;
    }
  };
  g.__reminderLoop = setInterval(tick, 60_000);
  g.__reminderLoop.unref?.();
  setTimeout(tick, 5_000).unref?.();
}
