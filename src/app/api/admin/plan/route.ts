import { batchOf, isValidBatch, type BatchField } from "@/lib/batches";
import { isAdmin } from "@/lib/auth";
import { activeEnrollment } from "@/lib/batch";
import { BRAND, type ClassLevel } from "@/lib/config";
import { newId, nowISO } from "@/lib/ids";
import { after } from "next/server";
import { batchUserIds } from "@/lib/adminData";
import { refreshProgress } from "@/lib/progress";
import {
  audienceSize,
  deleteTask,
  getBatchPlans,
  getTask,
  getUser,
  insertNotice,
  markBatchProgressStale,
  saveBatchPlan,
  saveTask,
  clearMovedSteps,
  setEnrollmentStart,
  setLearnPlan,
} from "@/lib/store";
import { body, fail, ok } from "@/lib/http";
import { batchKey, dayKey, fromKey, weekKeyOf } from "@/lib/learn";
import { chaptersFor, subjectsFor } from "@/lib/syllabus";
import { createCalendarEvent, googleMode } from "@/lib/integrations/google";
import type { Audience, MentorTask, PlanEdits, TaskKind, User } from "@/lib/types";

const KINDS: TaskKind[] = ["topic", "questions", "revision", "meet", "other"];
const isDay = (d: string) => Number.isFinite(fromKey(d));

/**
 * The mentor edits a roadmap, for one student ({ userId }) or a whole batch ({ cls, field }).
 * Actions: addTask, updateTask, deleteTask, move, skip, endDate, order, weekGoal, fresh, release, checkpoint
 */
export async function POST(req: Request) {
  if (!(await isAdmin())) return fail("Unauthorised", 401);
  const x = (await body(req)) as Record<string, unknown>;
  const str = (k: string, max = 300) => (typeof x[k] === "string" ? (x[k] as string).trim().slice(0, max) : "");
  // Who is being edited
  let student: User | undefined;
  let cls: ClassLevel, field: BatchField;
  if (x.userId) {
    student = await getUser(String(x.userId));
    if (!student?.profile) return fail("Student not found.");
    ({ cls, field } = batchOf(student)); // the student's batch decides syllabus (Class 12: JEE / NEET / Boards)
  } else {
    if (!isValidBatch(String(x.cls), String(x.field))) return fail("Pick a batch.");
    cls = x.cls as ClassLevel;
    field = x.field as BatchField;
  }
  const target: MentorTask["target"] = student ? { type: "student", userId: student.id } : { type: "batch", cls, field };
  const audience: Audience = student ? { type: "student", userId: student.id } : { type: "batch", cls, field };
  // The plan being edited is loaded once and saved once at the end.
  const key = batchKey(cls, field);
  const editing: PlanEdits = student ? { ...(student.learn?.plan || {}) } : { ...((await getBatchPlans([key]))[key] || {}) };
  let planChanged = false;
  const plan = (): PlanEdits => {
    planChanged = true;
    return editing;
  };
  const chapterIds = new Set(Object.values(chaptersFor(cls, field)).flat().map((c) => c.id));
  const notice = async (title: string, text: string, link = "/dashboard?tab=roadmap") => {
    const n = await audienceSize(audience);
    if (n) await insertNotice({ id: newId("n_"), title: title.slice(0, 120), body: text.slice(0, 2000), link, audience, recipients: n, createdAt: nowISO() });
  };
  const finish = async () => {
    if (planChanged) {
      if (student) await setLearnPlan(student.id, editing);
      else await saveBatchPlan(key, editing);
    }
    if (student) await refreshProgress([student.id]);
    else {
      await markBatchProgressStale(cls, field);
      const ids = await batchUserIds(cls, field);
      after(() => refreshProgress(ids.slice(0, 300))); // the rest by the hourly job
    }
    return ok();
  };

  switch (x.action) {
    case "addTask":
    case "updateTask": {
      const kind = x.kind as TaskKind;
      if (!KINDS.includes(kind)) return fail("Pick what kind of item this is.");
      const title = str("title", 140);
      if (title.length < 2) return fail("Write a title.");
      const date = str("date");
      if (!isDay(date)) return fail("Pick a date.");
      const time = str("time");
      if (kind === "meet" && !/^\d{2}:\d{2}$/.test(time)) return fail("Pick a time for the meeting.");
      const subject = str("subject");
      if (subject && !subjectsFor(field).includes(subject as never)) return fail("That subject is not in this batch.");
      let link = str("link", 400);
      if (link && !/^(https?:\/\/|\/)/.test(link)) link = `https://${link}`;
      const questions = (Array.isArray(x.questions) ? (x.questions as { q?: unknown; a?: unknown }[]) : [])
        .map((r) => ({ q: String(r?.q || "").trim().slice(0, 1000), a: String(r?.a || "").trim().slice(0, 1000) || undefined }))
        .filter((r) => r.q)
        .slice(0, 50);
      if (kind === "questions" && !questions.length) return fail("Add at least one question.");
      const minutes = Math.min(600, Math.max(5, Math.round(Number(x.minutes) || (kind === "meet" ? 45 : 30))));
      const fields = { kind, title, subject: subject || undefined, date, time: kind === "meet" ? time : undefined, minutes, note: str("note", 3000) || undefined, link: link || undefined, questions: kind === "questions" ? questions : undefined };

      let task: MentorTask;
      if (x.action === "updateTask") {
        const t = await getTask(String(x.id));
        if (!t) return fail("Item not found.");
        task = { ...t, ...fields };
      } else {
        task = { id: newId("t_"), target, createdAt: nowISO(), ...fields };
      }

      if (kind === "meet" && x.autoMeet && !task.link) {
        if (!(await googleMode())) return fail("Connect Google Calendar first (Admin > Calendar), or paste a meeting link.");
        try {
          const ev = await createCalendarEvent({
            requestId: `${task.id}-${Date.now()}`,
            title: `${BRAND}: ${task.title}`,
            description: task.note || "",
            start: new Date(`${date}T${time}:00+05:30`).toISOString(),
            minutes,
            withMeet: true,
          });
          task.link = ev.meetLink;
        } catch (e) {
          return fail(e instanceof Error ? e.message : "Could not create the Meet link.");
        }
      }
      await saveTask(task);
      if (x.notify) {
        const when = new Date(`${date}T${time || "09:00"}:00+05:30`).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", weekday: "short", day: "numeric", month: "short", ...(kind === "meet" ? { hour: "numeric", minute: "2-digit" } : {}) });
        if (kind === "meet") await notice(`Meeting: ${task.title}`, `${when}.${task.note ? ` ${task.note}` : ""}`, task.link || "/dashboard");
        else await notice(`${x.action === "updateTask" ? "Updated" : "New"} on your roadmap: ${task.title}`, `For ${when}.${task.note ? ` ${task.note}` : ""}`);
      }
      await finish();
      return ok({ id: task.id, link: task.link });
    }
    case "deleteTask": {
      if (!(await deleteTask(String(x.id)))) return fail("Item not found.");
      break;
    }
    case "move": {
      if (!student) return fail("Moving one step works per student.");
      const stepId = str("stepId");
      const [cid, kind] = stepId.split(":");
      if (!chapterIds.has(cid) || !["learn", "practice"].includes(kind)) return fail("Unknown step.");
      const date = str("date");
      const pl = plan();
      pl.moved ??= {};
      if (!date) delete pl.moved[stepId];
      else if (!isDay(date)) return fail("Pick a date.");
      else pl.moved[stepId] = date;
      break;
    }
    case "skip": {
      const cid = str("chapterId");
      if (!chapterIds.has(cid)) return fail("Unknown chapter.");
      const pl = plan();
      const set = new Set(pl.skip || []);
      if (x.on) set.add(cid);
      else set.delete(cid);
      pl.skip = [...set];
      break;
    }
    case "endDate": {
      const d = str("date");
      if (d && !isDay(d)) return fail("Pick a date.");
      plan().endDate = d || undefined;
      break;
    }
    case "order": {
      const keys = subjectsFor(field) as string[];
      const order = (Array.isArray(x.order) ? (x.order as string[]) : []).filter((k) => keys.includes(k));
      plan().order = order.length ? [...new Set(order)] : undefined;
      break;
    }
    case "weekGoal": {
      const d = str("week");
      if (!isDay(d)) return fail("Pick a week.");
      const wk = weekKeyOf(d);
      const text = str("text", 1000);
      const pl = plan();
      pl.weekGoals ??= {};
      if (text) pl.weekGoals[wk] = text;
      else delete pl.weekGoals[wk];
      if (text && x.notify) {
        const label = new Date(fromKey(wk)).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short" });
        await notice(`Your goal for the week of ${label}`, text);
      }
      break;
    }
    case "release": {
      // What students see: "week" = only up to this week, "next" = also next week, "upto" = up to a chosen week,
      // "all" = whole roadmap, "batch" = (one student) follow the batch setting again
      const mode = str("mode");
      const thisWeek = weekKeyOf(dayKey(Date.now()));
      const pl = plan();
      if (mode === "week") pl.release = { until: thisWeek };
      else if (mode === "next") pl.release = { until: dayKey(fromKey(thisWeek) + 7 * 86_400_000) };
      else if (mode === "upto") {
        const d = str("week");
        if (!isDay(d)) return fail("Pick a week.");
        pl.release = { until: weekKeyOf(d) };
      } else if (mode === "all") pl.release = { all: true };
      else if (mode === "batch" && student) pl.release = undefined;
      else return fail("Unknown choice.");
      if (x.notify && (mode === "next" || mode === "upto" || mode === "all")) await notice("Next week's plan is ready", "Your mentor has shared your next week. Open the roadmap to see it.");
      break;
    }
    case "checkpoint": {
      // Test syllabus (and optional date) of one checkpoint
      const no = Math.round(Number(x.no));
      if (!(no >= 1 && no <= 60)) return fail("Unknown test.");
      const pl = plan();
      pl.checkpoints ??= {};
      if (x.reset) delete pl.checkpoints[String(no)];
      else {
        const chapters = (Array.isArray(x.chapters) ? (x.chapters as unknown[]) : []).map(String).filter((c) => chapterIds.has(c));
        if (!chapters.length) return fail("Pick at least one chapter for this test.");
        const date = str("date");
        if (date && !isDay(date)) return fail("Pick a valid date.");
        if (date && new Date(fromKey(date)).getTime() < Date.now() - 86_400_000) return fail("The test date cannot be in the past.");
        pl.checkpoints[String(no)] = { chapters: [...new Set(chapters)], date: date || undefined };
        if (x.notify) await notice(`Checkpoint ${String(no).padStart(2, "0")} syllabus updated`, `${chapters.length} chapter${chapters.length === 1 ? "" : "s"} in this test. Open Tests to see the list.`, "/dashboard?tab=tests");
      }
      break;
    }
    case "fresh": {
      // A new roadmap: new start date, hand-moved dates dropped, optional finish date. Ticks are kept.
      const d = str("start");
      if (!isDay(d)) return fail("Pick a start date.");
      const end = str("end");
      if (end && (!isDay(end) || fromKey(end) <= fromKey(d))) return fail("The finish date must be after the start date.");
      const iso = new Date(`${d}T09:00:00+05:30`).toISOString();
      if (student && !activeEnrollment(student)) return fail("This student is not in a batch.");
      const ids = student ? [student.id] : await batchUserIds(cls, field);
      if (!ids.length) return fail("No students in this batch.");
      await setEnrollmentStart(ids, iso);
      if (student) plan().moved = {};
      else await clearMovedSteps(ids);
      plan().endDate = end || undefined;
      if (x.notify) await notice("Your roadmap has been updated", "Your mentor has made you a new study plan. Open the roadmap to see this week.");
      break;
    }
    default:
      return fail("Unknown action.");
  }
  return finish();
}
