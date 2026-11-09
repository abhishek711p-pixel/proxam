import { batchOf } from "@/lib/batches";
import { newId, nowISO } from "@/lib/ids";
import { insertDoubt } from "@/lib/store";
import { body, fail, ok } from "@/lib/http";
import { batchStudent } from "@/lib/learnGuard";
import { subjectsFor } from "@/lib/syllabus";

/** Send a new doubt to the mentors. */
export async function POST(req: Request) {
  const s = await batchStudent();
  if (!s) return fail("session", 401);
  const x = (await body(req)) as { subject?: string; topic?: string; text?: string };
  const text = (x.text || "").trim();
  if (!subjectsFor(batchOf(s.u).field).includes(x.subject as never)) return fail("Pick a subject.");
  if (text.length < 10) return fail("Write your doubt in a little more detail (at least 10 letters).");
  const now = nowISO();
  await insertDoubt({
    id: newId("d_"),
    userId: s.u.id,
    subject: x.subject!,
    topic: (x.topic || "").slice(0, 120),
    status: "open",
    messages: [{ from: "student", text: text.slice(0, 1000), at: now }],
    unreadForStudent: false,
    createdAt: now,
    updatedAt: now,
  });
  return ok();
}
