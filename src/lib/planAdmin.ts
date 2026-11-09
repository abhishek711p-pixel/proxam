import "server-only";
import type { PItem, PWeek } from "@/components/admin/PlanEditor";
import { batchKey, buildLearnData, dayKey, fromKey, planOf, type LearnData, weekKeyOf } from "./learn";
import type { TestRow } from "@/components/admin/RoadmapAccess";
import { chaptersFor, SUBJECT_NAME, subjectsFor, type SubjectKey } from "./syllabus";
import type { ClassLevel } from "./config";
import { batchOf, type BatchField } from "./batches";
import type { DB, Enrollment, MentorTask, PlanEdits, User } from "./types";

const DAY = 86_400_000;
const fmt = (t: number, o: Intl.DateTimeFormatOptions) => new Date(t).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", ...o });
const weekLabel = (k: string) => `${fmt(fromKey(k), { day: "numeric", month: "short" })} to ${fmt(fromKey(k) + 6 * DAY, { day: "numeric", month: "short" })}`;

export function subjectOpts(field: BatchField) {
  return subjectsFor(field).map((k) => ({ value: k, label: SUBJECT_NAME[k].en }));
}

export function chapterOpts(cls: ClassLevel, field: BatchField, skip: string[]) {
  const all = chaptersFor(cls, field);
  return (Object.keys(all) as SubjectKey[]).flatMap((k) =>
    all[k].filter((c) => !skip.includes(c.id)).map((c) => ({ value: c.id, label: `${SUBJECT_NAME[k].en}: ${twoLevels(cls, field) ? `Class ${c.level}, ` : ""}${c.title}` })),
  );
}

const twoLevels = (cls: ClassLevel, field: BatchField) => cls === "dropper" || field === "jee" || field === "neet";

function chapterTitle(cls: ClassLevel, field: BatchField, id: string) {
  for (const [k, list] of Object.entries(chaptersFor(cls, field))) {
    const c = list.find((c) => c.id === id);
    if (c) return `${SUBJECT_NAME[k as SubjectKey].en}: ${c.title}`;
  }
  return id;
}

/** "This week only", "Up to the week of 16 Nov", "Whole roadmap". */
export function releaseLabel(release: PlanEdits["release"], now = Date.now()) {
  const thisWeek = weekKeyOf(dayKey(now));
  if (release?.all) return "Whole roadmap";
  if (release?.until && release.until > thisWeek) return `This week + up to the week of ${fmt(fromKey(release.until), { day: "numeric", month: "short" })}`;
  return `This week only (${weekLabel(thisWeek)})`;
}

export function nextWeekLabel(now = Date.now()) {
  return weekLabel(dayKey(fromKey(weekKeyOf(dayKey(now))) + 7 * DAY));
}

/** Chapters of a class + stream, grouped by subject, for the test syllabus picker. */
export function syllabusGroups(cls: ClassLevel, field: BatchField) {
  const all = chaptersFor(cls, field);
  return (Object.keys(all) as SubjectKey[]).map((k) => ({
    name: SUBJECT_NAME[k].en,
    chapters: all[k].map((c) => ({ id: c.id, title: twoLevels(cls, field) ? `Class ${c.level}: ${c.title}` : c.title })),
  }));
}

/** One student's roadmap, as the admin editor shows it. */
export function studentPlanView(db: DB, u: User, enr: Enrollment) {
  const d: LearnData = buildLearnData(db, u, enr, "en", Date.now(), true);
  const p = batchOf(u); // the student's batch (Class 12 Science: JEE / NEET / Boards)
  const own = u.learn?.plan || {};
  const batch = db.batchPlans[batchKey(p.cls, p.field)] || {};
  const weeks: PWeek[] = d.weeks.map((w) => ({
    key: w.key,
    label: w.label,
    visible: w.visible,
    goal: own.weekGoals?.[w.key],
    batchGoal: batch.weekGoals?.[w.key],
    days: w.days.map((day) => ({
      key: day.items[0]?.dateKey || day.label,
      label: day.label,
      items: day.items.map(
        (x): PItem => ({
          id: x.id,
          kind: x.kind,
          subject: x.mentor ? (x.subjectKey ? SUBJECT_NAME[x.subjectKey as SubjectKey]?.en || "" : "") : x.subject,
          title: x.title,
          dateKey: x.dateKey,
          minutes: x.minutes,
          done: x.done,
          overdue: x.overdue,
          chapterId: x.chapterId,
          moved: x.moved,
          material: x.chapterId && db.chapterContent?.[x.chapterId]
            ? {
                videos: db.chapterContent[x.chapterId].videos.length,
                notes: db.chapterContent[x.chapterId].notes.length,
                dpp: db.chapterContent[x.chapterId].dpp.questions.length + (db.chapterContent[x.chapterId].dpp.pdf ? 1 : 0),
              }
            : undefined,
          mentor: x.mentor && { taskId: x.mentor.taskId, timeLabel: x.mentor.timeLabel, link: x.mentor.link, forBatch: x.mentor.forBatch },
        }),
      ),
    })),
  }));
  const skipped = [
    ...(batch.skip || []).map((id) => ({ id, title: chapterTitle(p.cls, p.field, id), fromBatch: true })),
    ...(own.skip || []).filter((id) => !(batch.skip || []).includes(id)).map((id) => ({ id, title: chapterTitle(p.cls, p.field, id) })),
  ];
  return {
    weeks,
    initialWeek: d.currentWeek,
    tasks: db.tasks.filter((t) => t.target.type === "student" && t.target.userId === u.id),
    skipped,
    allSkip: [...(batch.skip || []), ...(own.skip || [])],
    endDate: own.endDate,
    order: own.order || [],
    examLabel: `${d.exam.name}, ${d.exam.dateLabel}`,
    releaseStatus: releaseLabel(planOf(db, u).release),
    releaseFromBatch: !own.release && Boolean(batch.release),
    tests: d.checkpoints.map(
      (c): TestRow => ({
        no: c.no,
        title: c.title,
        dateLabel: c.dateLabel,
        dateKey: c.dateKey,
        chapterIds: c.topics.map((x) => x.id),
        source: own.checkpoints?.[String(c.no)] ? "student" : batch.checkpoints?.[String(c.no)] ? "batch" : "auto",
      }),
    ),
  };
}

/** A batch's own additions (mentor items and goals), week by week on the calendar. */
export function batchPlanView(plan: PlanEdits, tasks: MentorTask[], cls: ClassLevel, field: BatchField, now = Date.now(), sample?: LearnData) {
  const lastShown = plan.release?.all ? "9999-12-31" : plan.release?.until && plan.release.until > weekKeyOf(dayKey(now)) ? plan.release.until : weekKeyOf(dayKey(now));
  const thisWeek = weekKeyOf(dayKey(now));
  const keys = [thisWeek, ...tasks.map((t) => weekKeyOf(t.date)), ...Object.keys(plan.weekGoals || {})].sort();
  const first = keys[0];
  const last = [...keys].pop()!;
  const lastT = Math.max(fromKey(last), fromKey(thisWeek) + 11 * 7 * DAY);
  const weeks: PWeek[] = [];
  for (let t = fromKey(first); t <= lastT; t += 7 * DAY) {
    const key = dayKey(t);
    const inWeek = tasks.filter((x) => weekKeyOf(x.date) === key).sort((a, b) => a.date.localeCompare(b.date) || (a.time || "").localeCompare(b.time || ""));
    const dayKeys = [...new Set(inWeek.map((x) => x.date))];
    weeks.push({
      key,
      label: weekLabel(key),
      visible: key <= lastShown,
      goal: plan.weekGoals?.[key],
      days: dayKeys.map((dk) => ({
        key: dk,
        label: fmt(fromKey(dk), { weekday: "long", day: "numeric", month: "short" }),
        items: inWeek.filter((x) => x.date === dk).map((x) => taskItem(x)),
      })),
    });
  }
  return {
    weeks,
    initialWeek: Math.max(0, weeks.findIndex((w) => w.key === thisWeek)),
    tasks,
    skipped: (plan.skip || []).map((id) => ({ id, title: chapterTitle(cls, field, id) })),
    allSkip: plan.skip || [],
    endDate: plan.endDate,
    order: plan.order || [],
    releaseStatus: releaseLabel(plan.release, now),
    // tests: from one student of the batch (dates differ by start date), or numbered placeholders
    tests: (sample?.checkpoints.length
      ? sample.checkpoints.map((c) => ({ no: c.no, title: c.title, dateLabel: `${c.dateLabel} (for ${sample.firstName})`, dateKey: c.dateKey, auto: c.topics.map((x) => x.id) }))
      : Array.from({ length: 8 }, (_, i) => ({ no: i + 1, title: `Checkpoint ${String(i + 1).padStart(2, "0")}`, dateLabel: undefined, dateKey: undefined, auto: [] as string[] }))
    ).map(
      (c): TestRow => {
        const set = plan.checkpoints?.[String(c.no)];
        return { no: c.no, title: c.title, dateLabel: c.dateLabel, dateKey: set?.date || c.dateKey, chapterIds: set?.chapters || c.auto, source: set ? "set" : "auto" };
      },
    ),
  };
}

function taskItem(t: MentorTask): PItem {
  const [h, m] = (t.time || "").split(":").map(Number);
  return {
    id: `task:${t.id}`,
    kind: t.kind,
    subject: t.subject ? SUBJECT_NAME[t.subject as SubjectKey]?.en || "" : "",
    title: t.title,
    dateKey: t.date,
    minutes: t.minutes,
    mentor: { taskId: t.id, link: t.link, forBatch: true, timeLabel: t.time ? `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "am" : "pm"}` : undefined },
  };
}

