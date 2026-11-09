import "server-only";
import { CLASSES, FIELDS, type ClassLevel, type FieldId } from "./config";
import type { Masterclass } from "./types";

/** "2026-11-15" + "18:30" in India time -> ISO (UTC). */
export function istToIso(date: string, time: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return null;
  const d = new Date(`${date}T${time}:00+05:30`);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

/** Validate the admin form. Returns the fields to save, or an error message. */
export function readMasterclassForm(x: Record<string, unknown>): { error: string } | { data: Partial<Masterclass> } {
  const str = (k: string) => (typeof x[k] === "string" ? (x[k] as string).trim() : "");
  const cls = str("cls") as ClassLevel;
  if (!CLASSES.includes(cls)) return { error: "Pick a class." };
  const field = (str("field") || undefined) as FieldId | undefined;
  if (field && !(FIELDS[field] && FIELDS[field].classes.includes(cls))) return { error: "That stream is not offered for this class." };
  const title = str("title");
  if (title.length < 5) return { error: "Write a title (at least 5 letters)." };
  const startsAt = istToIso(str("date"), str("time"));
  if (!startsAt) return { error: "Pick a date and time." };
  const minutes = Number(x.minutes);
  if (!Number.isFinite(minutes) || minutes < 15 || minutes > 240) return { error: "Duration must be 15 to 240 minutes." };
  const price = Number(x.price);
  if (!Number.isFinite(price) || price < 0 || price > 10000) return { error: "Price must be between ₹0 and ₹10,000." };
  const link = str("meetingLink");
  if (link && !/^https:\/\//.test(link)) return { error: "The join link must start with https://" };
  return {
    data: { cls, field, title: title.slice(0, 140), desc: str("desc").slice(0, 600), host: str("host").slice(0, 80) || undefined, startsAt, minutes: Math.round(minutes), price: Math.round(price), meetingLink: link || undefined },
  };
}
