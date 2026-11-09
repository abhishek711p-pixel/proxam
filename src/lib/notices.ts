import { classLabel } from "./config";
import { batchFieldLabel } from "./batches";
import type { Audience, Notice, User } from "./types";

export function audienceLabel(a: Audience, student?: { name?: string; mobile: string }) {
  if (a.type === "all") return "Everyone";
  if (a.type === "class") return `${classLabel(a.cls)} (all students)`;
  if (a.type === "batch") return `Batch students${a.cls ? `, ${classLabel(a.cls)}` : ""}${a.field ? `, ${batchFieldLabel(a.field)}` : ""}`;
  return `Student: ${student?.name || "unknown"}${student ? ` (${student.mobile})` : ""}`;
}

export type NoticeItem = { id: string; title: string; body: string; link?: string; when: string; read: boolean };

/** Ready-to-show notifications for one student (dates formatted here so server and browser agree). */
export function noticeItems(list: Notice[], u: User, lang: "en" | "hi"): NoticeItem[] {
  const read = new Set(u.notifRead || []);
  return list.map((n) => ({
    id: n.id,
    title: n.title,
    body: n.body,
    link: n.link,
    read: read.has(n.id),
    when: new Date(n.createdAt).toLocaleString(lang === "hi" ? "hi-IN" : "en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }),
  }));
}
