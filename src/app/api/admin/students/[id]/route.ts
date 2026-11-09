import { batchLabel, batchOf, batchOfEnrollment, batchOptions, batchPrice, type BatchField } from "@/lib/batches";
import { isAdmin } from "@/lib/auth";
import { activeEnrollment, activeEnrollments } from "@/lib/batch";
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
  insertNotice,
  removeSeat,
  setEnrollmentStart,
  setEnrollmentTrack,
  setCurrentBatch,
  setLearnPlan,
  setProfile,
  setStepsDone,
} from "@/lib/store";
import { chaptersFor, type SubjectKey } from "@/lib/syllabus";

/**
 * Admin control over one student. One action per call:
 * profile, enroll, current, batch, unenroll, start, step, chapter, subject, reset, grantTest, removeSeat
 * A student can be in several batches; batch actions work on the one open on their dashboard ("current").
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
      // keep each batch if it still fits the new class and stream (Class 12 Science has four)
      const opts = batchOptions(cls, field);
      for (const e of activeEnrollments(u)) {
        const now = batchOfEnrollment(e, u).field;
        await setEnrollmentTrack(u.id, e.id, cls, opts.includes(now) ? now : opts[0]); // false = already in that batch: left as it was
      }
      break;
    }
    case "enroll": {
      // Also used for giveaways (gift: free batch). The student must have logged in and filled the profile.
      if (!p) return fail("This student has not finished signing up (profile). Ask them to log in on proxam.in and fill it first.");
      const opts = batchOptions(p.cls, p.field);
      const batch = (x.batch ? str("batch") : opts[0]) as BatchField;
      if (!opts.includes(batch)) return fail("Pick a batch this student can join.");
      if (activeEnrollments(u).some((e) => batchOfEnrollment(e, u).field === batch)) return fail("Already in this batch.");
      const amount = Number.isFinite(Number(x.amount)) ? Math.max(0, Math.round(Number(x.amount))) : batchPrice(p.cls, batch);
      const gift = Boolean(x.gift);
      if (!(await addEnrollment(u.id, { id: newId("e_"), amount: gift ? 0 : amount, paidAt: nowISO(), mode: "admin", cls: p.cls, field: batch }))) return fail("Already in this batch.");
      if (gift) {
        const name = batchLabel(p.cls, batch, p.language === "hi" ? "hi" : "en");
        await insertNotice({
          id: newId("n_"),
          title: p.language === "hi" ? "बधाई! तुम्हें फ्री बैच मिला 🎉" : "Congratulations! You got a free batch 🎉",
          body: p.language === "hi" ? `${name} अब तुम्हारा है। अपना रोडमैप डैशबोर्ड पर खोलो।` : `${name} is now yours. Open your dashboard to see your roadmap.`,
          link: "/dashboard",
          audience: { type: "student", userId: u.id },
          recipients: 1,
          createdAt: nowISO(),
        });
      }
      break;
    }
    case "current": {
      const e = activeEnrollments(u).find((e) => e.id === str("enr"));
      if (!e) return fail("Not in that batch.");
      await setCurrentBatch(u.id, e.id);
      break;
    }
    case "batch": {
      if (!p || !enr) return fail("Not in a batch.");
      const batch = str("batch") as BatchField;
      if (!batchOptions(p.cls, p.field).includes(batch)) return fail("Pick a batch this student can join.");
      if (!(await setEnrollmentTrack(u.id, enr.id, p.cls, batch))) return fail("The student is already in that batch.");
      break;
    }
    case "unenroll": {
      if (!enr) return fail("Not in a batch.");
      await endEnrollment(u.id, enr.id);
      break;
    }
    case "start": {
      if (!enr) return fail("Not in a batch.");
      const d = str("date");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return fail("Pick a date.");
      await setEnrollmentStart([u.id], new Date(`${d}T09:00:00+05:30`).toISOString(), batchOfEnrollment(enr, u));
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
