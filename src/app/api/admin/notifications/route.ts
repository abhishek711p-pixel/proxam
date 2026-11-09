import { isAdmin } from "@/lib/auth";
import { CLASSES, FIELDS, type ClassLevel } from "@/lib/config";
import { isTrack, type BatchField } from "@/lib/batches";
import { newId, nowISO } from "@/lib/ids";
import { audienceSize, getUser, insertNotice } from "@/lib/store";
import { body, fail, ok } from "@/lib/http";
import type { Audience } from "@/lib/types";

type In = { title?: string; body?: string; link?: string; to?: string; cls?: string; field?: string; student?: string; preview?: boolean };

function audienceOf(x: In): Audience | string {
  const cls = CLASSES.includes(x.cls as ClassLevel) ? (x.cls as ClassLevel) : undefined;
  const field = x.field && (x.field in FIELDS || isTrack(x.field)) ? (x.field as BatchField) : undefined;
  if (x.to === "all") return { type: "all" };
  if (x.to === "class") return cls ? { type: "class", cls } : "Pick a class.";
  if (x.to === "batch") return { type: "batch", cls, field };
  if (x.to === "student") return x.student ? { type: "student", userId: x.student } : "Pick a student.";
  return "Pick who gets it.";
}

/** Send a notification (or, with preview: true, just count who would get it). */
export async function POST(req: Request) {
  if (!(await isAdmin())) return fail("Unauthorised", 401);
  const x = (await body(req)) as In;
  const a = audienceOf(x);
  if (typeof a === "string") return fail(a);
  if (a.type === "student" && !(await getUser(a.userId))) return fail("Student not found.");
  const recipients = await audienceSize(a);
  if (x.preview) return ok({ recipients });

  const title = (x.title || "").trim().slice(0, 120);
  const text = (x.body || "").trim().slice(0, 2000);
  let link = (x.link || "").trim().slice(0, 400);
  if (title.length < 2) return fail("Write a title.");
  if (link && !/^(https?:\/\/|\/)/.test(link)) link = `https://${link}`;
  if (!recipients) return fail("Nobody matches this audience yet.");
  await insertNotice({ id: newId("n_"), title, body: text, link: link || undefined, audience: a, recipients, createdAt: nowISO() });
  return ok({ recipients });
}
