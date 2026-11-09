import { classLabel, type ClassLevel, type FieldId } from "./config";
import type { Masterclass, Profile, User } from "./types";

/** Short track names students recognise (exam first). */
export const MC_TRACK: Record<FieldId, { en: string; hi: string }> = {
  foundation10: { en: "Class 10 Boards", hi: "कक्षा 10 बोर्ड" },
  pcm: { en: "JEE (PCM)", hi: "JEE (PCM)" },
  pcb: { en: "NEET (PCB)", hi: "NEET (PCB)" },
  pcmb: { en: "JEE + NEET (PCMB)", hi: "JEE + NEET (PCMB)" },
  commerce_maths: { en: "Commerce with Maths", hi: "कॉमर्स (मैथ्स के साथ)" },
  commerce_no_maths: { en: "Commerce without Maths", hi: "कॉमर्स (बिना मैथ्स)" },
};

/** "Class 12, NEET (PCB)" */
export function mcAudience(m: Pick<Masterclass, "cls" | "field">, lang: "en" | "hi" = "en") {
  if (m.cls === "10") return classLabel("10", lang);
  return m.field ? `${classLabel(m.cls, lang)}, ${MC_TRACK[m.field][lang]}` : classLabel(m.cls, lang);
}

/** Is this masterclass meant for this student? PCMB students can take both JEE and NEET ones. */
export function mcMatches(m: Masterclass, p: Pick<Profile, "cls" | "field">) {
  if (m.cls !== p.cls) return false;
  if (!m.field || m.field === p.field) return true;
  return p.field === "pcmb" && (m.field === "pcm" || m.field === "pcb");
}

export const mcEnd = (m: Masterclass) => new Date(new Date(m.startsAt).getTime() + m.minutes * 60_000);
export const mcIsOver = (m: Masterclass, now = Date.now()) => mcEnd(m).getTime() < now;

/** Upcoming (or running) masterclasses, soonest first. */
export function upcomingMasterclasses(all: Masterclass[], cls?: ClassLevel) {
  return all
    .filter((m) => m.status === "scheduled" && !mcIsOver(m) && (!cls || m.cls === cls))
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

/** Upcoming masterclasses meant for this student. */
export function upcomingFor(all: Masterclass[], p: Pick<Profile, "cls" | "field">) {
  return upcomingMasterclasses(all).filter((m) => mcMatches(m, p));
}

/** Masterclasses this student has a seat in, upcoming first, then past. */
export function seatsOf(all: Masterclass[], user: User) {
  return (user.masterclassSeats || [])
    .map((s) => ({ seat: s, mc: all.find((m) => m.id === s.masterclassId) }))
    .filter((x): x is { seat: (typeof x)["seat"]; mc: Masterclass } => Boolean(x.mc))
    .sort((a, b) => {
      const ao = mcIsOver(a.mc) ? 1 : 0;
      const bo = mcIsOver(b.mc) ? 1 : 0;
      return ao - bo || a.mc.startsAt.localeCompare(b.mc.startsAt);
    });
}

export const fmtMcDate = (iso: string, lang: "en" | "hi" = "en") =>
  new Date(iso).toLocaleDateString(lang === "hi" ? "hi-IN" : "en-IN", { timeZone: "Asia/Kolkata", weekday: "long", day: "numeric", month: "long" });
export const fmtMcTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "numeric", minute: "2-digit" });
export const mcDay = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric" });
export const mcMonth = (iso: string, lang: "en" | "hi" = "en") =>
  new Date(iso).toLocaleDateString(lang === "hi" ? "hi-IN" : "en-IN", { timeZone: "Asia/Kolkata", month: "short" });
export const mcWeekday = (iso: string, lang: "en" | "hi" = "en") =>
  new Date(iso).toLocaleDateString(lang === "hi" ? "hi-IN" : "en-IN", { timeZone: "Asia/Kolkata", weekday: "short" });

/** WhatsApp text the student sends to their own chat. */
export function mcWhatsAppText(m: Masterclass, siteUrl: string) {
  return [
    `*Proxam masterclass*`,
    m.title,
    `When: ${fmtMcDate(m.startsAt)}, ${fmtMcTime(m.startsAt)} (${m.minutes} min)`,
    m.meetingLink ? `Join: ${m.meetingLink}` : `Join link: ${siteUrl}/masterclass (it appears there before the class)`,
    "",
    "Please join 5 minutes early.",
  ].join("\n");
}
