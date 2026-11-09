import { batchOf, batchOfEnrollment, batchOptions, batchPrice, type BatchField } from "@/lib/batches";
import { isAdmin } from "@/lib/auth";
import { activeEnrollment } from "@/lib/batch";
import { BOARDS, CLASSES, FIELDS, priceFor, type ClassLevel, type FieldId } from "@/lib/config";
import { newId, nowISO } from "@/lib/ids";
import { body, fail, ok } from "@/lib/http";
import { stepExists } from "@/lib/learn";
import { refreshProgress } from "@/lib/progress";
import {
  addEnrollment,
  addTestPurchase,
  clearSteps,
  endEnrollment,
  getTask,
  getUser,
  removeSeat,
  setEnrollmentStart,
  setEnrollmentTrack,
  setLearnPlan,
  setProfile,
  setStepsDone,
} from "@/lib/store";
import { chaptersFor, type SubjectKey } from "@/lib/syllabus";

/**
 * Admin control over one student. One action per call:
 * profile, enroll, unenroll, start, step, chapter, subject, reset, grantTest, removeSeat
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return fail("Unauthorised", 401);
  const { id } = await params;
  const u = await getUser(id);
  if (!u) return fail("Student not found", 404);
  const x = (await body(req)) as Record<string, unknown>;
  const str = (k: string) => (typeof x[k] === "string" ? (x[k] as string).trim() : "");
  const enr = activeEnrollment(u);
  const p = u.profile;

  switch (x.action) {
    case "profile": {
      if (!p) return fail("This student has not filled the profile yet.");
      const cls = str("cls") as ClassLevel;
      const field = str("field") as FieldId;
      if (!CLASSES.includes(cls)) return fail("Pick a class.");
      if (!FIELDS[field] || !FIELDS[field].classes.includes(cls)) return fail("That stream is not offered for this class.");
      if (str("name").length < 2) return fail("Write the student's name.");
      if (str("board") && !BOARDS.includes(str("board"))) return fail("Pick a board.");
      await setProfile(u.id, {
        ...p,
        name: str("name").slice(0, 80),
        cls,
        field,
        stream: FIELDS[field].stream,
        board: str("board") || p.board,
        city: str("city").slice(0, 60) || p.city,
        school: str("school").slice(0, 120),
      });
      if (enr) {
        // keep the student's batch if it still fits the new class and stream (Class 12 Science has four)
        const opts = batchOptions(cls, field);
        const now = batchOfEnrollment(enr, u).field;
        await setEnrollmentTrack(u.id, cls, opts.includes(now) ? now : opts[0]);
      }
      break;
    }
    case "enroll": {
      if (!p) return fail("The student must fill the profile first.");
      if (enr) return fail("Already in a batch.");
      const opts = batchOptions(p.cls, p.field);
      const batch = (x.batch ? str("batch") : opts[0]) as BatchField;
      if (!opts.includes(batch)) return fail("Pick a batch this student can join.");
      const amount = Number.isFinite(Number(x.amount)) ? Math.max(0, Math.round(Number(x.amount))) : batchPrice(p.cls, batch);
      if (!(await addEnrollment(u.id, { id: newId("e_"), amount, paidAt: nowISO(), mode: "admin", cls: p.cls, field: batch }))) return fail("Already in a batch.");
      break;
    }
    case "batch": {
      if (!p || !enr) return fail("Not in a batch.");
      const batch = str("batch") as BatchField;
      if (!batchOptions(p.cls, p.field).includes(batch)) return fail("Pick a batch this student can join.");
      await setEnrollmentTrack(u.id, p.cls, batch);
      break;
    }
    case "unenroll": {
      if (!enr) return fail("Not in a batch.");
      await endEnrollment(u.id);
      break;
    }
    case "start": {
      if (!enr) return fail("Not in a batch.");
      const d = str("date");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return fail("Pick a date.");
      await setEnrollmentStart([u.id], new Date(`${d}T09:00:00+05:30`).toISOString());
      if (x.fresh && u.learn?.plan) await setLearnPlan(u.id, { ...u.learn.plan, moved: {} }); // a fresh roadmap drops the hand-moved dates
      break;
    }
    case "step":
    case "chapter":
    case "subject":
    case "reset": {
      if (!p) return fail("No profile.");
      const bt = batchOf(u);
      const all = chaptersFor(bt.cls, bt.field);
      const on = Boolean(x.done);
      const ids: string[] = [];
      if (x.action === "reset") {
        await clearSteps(u.id);
        break;
      }
      if (x.action === "step") {
        const sid = str("id");
        const task = sid.startsWith("task:") ? await getTask(sid.slice(5)) : undefined;
        if (!stepExists(u, sid, task ? [task] : [])) return fail("Unknown topic.");
        ids.push(sid);
      } else if (x.action === "chapter") {
        const cid = str("id");
        if (!Object.values(all).flat().some((c) => c.id === cid)) return fail("Unknown chapter.");
        ids.push(`${cid}:learn`, `${cid}:practice`);
      } else {
        const list = all[str("subject") as SubjectKey];
        if (!list) return fail("Unknown subject.");
        for (const c of list) ids.push(`${c.id}:learn`, `${c.id}:practice`);
      }
      await setStepsDone(u.id, on ? ids : [], on ? [] : ids);
      break;
    }
    case "grantTest": {
      await addTestPurchase(u.id, { id: newId("tp_"), amount: 0, paidAt: nowISO(), mode: "admin" });
      break;
    }
    case "removeSeat": {
      await removeSeat(u.id, str("masterclassId"));
      break;
    }
    default:
      return fail("Unknown action.");
  }
  await refreshProgress([u.id]);
  return ok();
}
