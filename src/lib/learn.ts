import "server-only";
import { FIELDS, totalQuestions } from "./config";
import { batchFieldLabel, batchOf, blueprintField, TRACKS, isTrack } from "./batches";
import { chaptersFor, SUBJECT_NAME, subjectsFor, type Chapter, type SubjectKey } from "./syllabus";
import { seatsOf, mcIsOver, fmtMcDate, fmtMcTime } from "./masterclass";
import type { DB, Enrollment, Lang, MentorTask, PlanEdits, TaskKind, User } from "./types";
import { activeEnrollment as activeEnrollmentOf } from "./batch";
import { noticeItems } from "./notices";
import { youtubeId } from "./youtube";

/**
 * The batch student's roadmap, built fresh on every request from:
 * the syllabus, the enrolment date, the exam date, the latest test result, and the steps marked done.
 * Stored: `user.learn.done` (ticks), plus the mentor's edits: `user.learn.plan`, `db.batchPlans`, `db.tasks`.
 */

const DAY = 86_400_000;
const IST = 5.5 * 3600_000;
const LEARN_MIN = 35;
const PRACTICE_MIN = 25;
export const CHECKPOINT_EVERY_DAYS = 14;

/** Midnight IST of the given moment, as a UTC timestamp. */
const istDay = (t: number) => Math.floor((t + IST) / DAY) * DAY - IST;
const istDow = (t: number) => new Date(t + IST).getUTCDay(); // 0 Sun
const istKey = (t: number) => new Date(t + IST).toISOString().slice(0, 10);

function fmt(t: number, lang: Lang, o: Intl.DateTimeFormatOptions) {
  return new Date(t).toLocaleDateString(lang === "hi" ? "hi-IN" : "en-IN", { timeZone: "Asia/Kolkata", ...o });
}

type StepKind = "learn" | "practice" | TaskKind;
type Step = { id: string; chapter?: Chapter; task?: MentorTask; kind: StepKind; minutes: number; date: number };

export const dayKey = istKey;
/** "YYYY-MM-DD" (IST) to the IST-midnight timestamp, or NaN. */
export const fromKey = (k: string) => (/^\d{4}-\d{2}-\d{2}$/.test(k) ? Date.parse(`${k}T00:00:00+05:30`) : NaN);
export const weekKeyOf = (k: string) => {
  const t = fromKey(k);
  return istKey(t - ((istDow(t) + 6) % 7) * DAY);
};

export const batchKey = (cls: string, field: string) => `${cls}|${field}`;

/** The batch's edits with this student's own edits on top. */
export function planOf(db: DB, u: User): PlanEdits {
  const bt = batchOf(u);
  const b = db.batchPlans?.[batchKey(bt.cls, bt.field)] || {};
  const own = u.learn?.plan || {};
  return {
    endDate: own.endDate || b.endDate,
    order: own.order?.length ? own.order : b.order,
    skip: [...new Set([...(b.skip || []), ...(own.skip || [])])],
    moved: own.moved || {},
    weekGoals: { ...(b.weekGoals || {}), ...(own.weekGoals || {}) },
    release: own.release || b.release,
    checkpoints: { ...(b.checkpoints || {}), ...(own.checkpoints || {}) },
  };
}

/** Mentor tasks that apply to this student. */
export function tasksOf(db: DB, u: User) {
  if (!u.profile) return [];
  const b = batchOf(u);
  return (db.tasks || []).filter((t) => (t.target.type === "student" ? t.target.userId === u.id : t.target.cls === b.cls && t.target.field === b.field));
}

/** Next date (IST midnight) with this month/day that is at least `minDays` away. */
function nextDate(now: number, month: number, day: number, minDays: number) {
  const y = new Date(now + IST).getUTCFullYear();
  for (let k = 0; k < 3; k++) {
    const t = Date.UTC(y + k, month - 1, day) - IST;
    if (t - now >= minDays * DAY) return t;
  }
  return Date.UTC(y + 1, month - 1, day) - IST;
}

/** Which exam the plan counts down to. */
export function examFor(u: User, from: number): { name: { en: string; hi: string }; date: number } {
  const p = batchOf(u);
  if (isTrack(p.field)) {
    const e = TRACKS[p.field].exam;
    if (e === "jee") return { name: { en: "JEE Main", hi: "JEE Main" }, date: nextDate(from, 1, 22, 60) };
    if (e === "neet") return { name: { en: "NEET", hi: "NEET" }, date: nextDate(from, 5, 3, 60) };
  }
  if (p.cls === "10") return { name: { en: "Class 10 board exams", hi: "कक्षा 10 बोर्ड परीक्षा" }, date: nextDate(from, 2, 15, 45) };
  if (p.cls === "12") return { name: { en: "Class 12 board exams", hi: "कक्षा 12 बोर्ड परीक्षा" }, date: nextDate(from, 2, 15, 45) };
  if (p.cls === "11") return { name: { en: "Class 11 final exams", hi: "कक्षा 11 फ़ाइनल परीक्षा" }, date: nextDate(from, 3, 10, 45) };
  if (p.field === "pcb" || p.field === "pcmb") return { name: { en: "NEET", hi: "NEET" }, date: nextDate(from, 5, 3, 60) };
  if (p.field === "pcm") return { name: { en: "JEE Main", hi: "JEE Main" }, date: nextDate(from, 1, 22, 60) };
  return { name: { en: "CUET", hi: "CUET" }, date: nextDate(from, 5, 15, 60) };
}

/** Map a test subject name ("Physics", "Maths (Class 10)") to a syllabus subject. */
function subjectFromResult(name: string, keys: SubjectKey[]): SubjectKey | undefined {
  const n = name.toLowerCase();
  // Class 10 test splits science into Physics/Chemistry/Biology (Class 10); the syllabus keeps one Science subject
  if (keys.includes("science10") && /^(physics|chemistry|biology|science)/.test(n)) return "science10";
  if (keys.includes("sst10") && n.startsWith("social")) return "sst10";
  return keys.find((k) => {
    const en = SUBJECT_NAME[k].en.toLowerCase();
    return n === en || n.startsWith(en) || (k === "maths10" && n.startsWith("math")) || (k === "maths" && n.startsWith("math")) || (k === "science10" && n.startsWith("science"));
  });
}

function buildSteps(u: User, enr: Enrollment, weak: SubjectKey[], examDate: number, plan: PlanEdits, tasks: MentorTask[]) {
  const p = batchOf(u);
  const byS = chaptersFor(p.cls, p.field);
  const keys = subjectsFor(p.field);
  const skip = new Set(plan.skip || []);
  // Mentor's subject order if set, otherwise weak subjects go first in each round, so they get more early time
  const order = plan.order?.length
    ? [...plan.order.filter((k): k is SubjectKey => keys.includes(k as SubjectKey)), ...keys.filter((k) => !plan.order!.includes(k))]
    : [...keys].sort((a, b) => (weak.includes(b) ? 1 : 0) - (weak.includes(a) ? 1 : 0));
  const chapters: Chapter[] = [];
  const longest = Math.max(...order.map((k) => byS[k].length));
  for (let r = 0; r < longest; r++) for (const k of order) if (byS[k][r] && !skip.has(byS[k][r].id)) chapters.push(byS[k][r]);

  const start = istDay(new Date(enr.paidAt).getTime());
  // Leave three weeks before the exam for full revision (or finish by the mentor's date); at least one week.
  const custom = plan.endDate ? fromKey(plan.endDate) : NaN;
  const end = Number.isFinite(custom) ? Math.max(start + 7 * DAY, custom) : Math.max(start + 28 * DAY, examDate - 21 * DAY);
  const days: number[] = [];
  for (let t = start; t <= end; t += DAY) if (istDow(t) !== 0) days.push(t); // Sundays off
  const raw = chapters.flatMap((c) => [
    { chapter: c, kind: "learn" as const, minutes: LEARN_MIN },
    { chapter: c, kind: "practice" as const, minutes: PRACTICE_MIN },
  ]);
  const moved = plan.moved || {};
  const auto: Step[] = raw.map((s, i) => {
    const id = `${s.chapter.id}:${s.kind}`;
    const m = moved[id] ? fromKey(moved[id]) : NaN;
    return { ...s, id, date: Number.isFinite(m) ? m : days[Math.min(days.length - 1, Math.floor((i * days.length) / raw.length))] };
  });
  const extra: Step[] = tasks
    .map((t) => ({ id: `task:${t.id}`, task: t, kind: t.kind, minutes: t.minutes, date: fromKey(t.date) }))
    .filter((x) => Number.isFinite(x.date));
  // keep the automatic order within a day; mentor items go first that day
  const steps = [...extra, ...auto].map((x, i) => ({ x, i })).sort((a, b) => a.x.date - b.x.date || a.i - b.i).map((o) => o.x);
  return { steps, start, chapters };
}

/** Checkpoint n falls on the first Saturday on or after start + 14n days, unless the mentor set its date. */
function checkpointDates(start: number, until: number, plan?: PlanEdits) {
  const out: number[] = [];
  for (let n = 1; n < 60; n++) {
    let t = start + n * CHECKPOINT_EVERY_DAYS * DAY;
    while (istDow(t) !== 6) t += DAY;
    if (t > until) break;
    const set = plan?.checkpoints?.[String(n)]?.date;
    const own = set ? fromKey(set) : NaN;
    out.push(Number.isFinite(own) ? own : t);
  }
  return out;
}

/** Which weeks the student can see: always up to this week; later weeks only when the mentor released them. */
function lastVisibleWeek(plan: PlanEdits, thisWeek: number) {
  if (plan.release?.all) return Infinity;
  const until = plan.release?.until ? fromKey(plan.release.until) : NaN;
  return Number.isFinite(until) ? Math.max(thisWeek, until) : thisWeek;
}

export function streakOf(done: Record<string, string>, today: number) {
  const days = new Set(Object.values(done).map((iso) => istKey(new Date(iso).getTime())));
  let current = 0;
  let t = days.has(istKey(today)) ? today : today - DAY;
  while (days.has(istKey(t))) {
    current++;
    t -= DAY;
  }
  const sorted = [...days].sort();
  let best = 0;
  let run = 0;
  let prev = "";
  for (const d of sorted) {
    run = prev && Date.parse(d) - Date.parse(prev) === DAY ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }
  return { current, best: Math.max(best, current) };
}

export type LearnTask = {
  id: string;
  subjectKey: string; // "" for mentor items with no subject
  subject: string;
  title: string;
  kind: StepKind;
  minutes: number;
  done: boolean;
  forTest: boolean;
  dateLabel: string;
  dateKey: string; // YYYY-MM-DD
  overdue: boolean;
  chapterId?: string;
  /** Present on items a mentor added */
  mentor?: { taskId: string; note?: string; link?: string; time?: string; timeLabel?: string; questions?: { q: string; a?: string }[]; forBatch: boolean };
  moved?: boolean;
};

const KIND_LABEL: Record<TaskKind, { en: string; hi: string }> = {
  topic: { en: "Topic from your mentor", hi: "मेंटर का टॉपिक" },
  questions: { en: "Practice questions", hi: "प्रैक्टिस प्रश्न" },
  revision: { en: "Revision", hi: "रिवीज़न" },
  meet: { en: "Meeting", hi: "मीटिंग" },
  other: { en: "Task from your mentor", hi: "मेंटर का काम" },
};
export const kindLabel = (k: TaskKind, lang: Lang) => KIND_LABEL[k][lang];
const time12 = (hhmm?: string) => {
  if (!hhmm) return undefined;
  const [h, m] = hhmm.split(":").map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "am" : "pm"}`;
};

export type LearnData = ReturnType<typeof buildLearnData>;

/** `admin`: the admin panel sees every week; students see only the weeks released to them. */
export function buildLearnData(db: DB, user: User, enr: Enrollment, lang: Lang, now = Date.now(), admin = false) {
  const u = db.users.find((x) => x.id === user.id) || user;
  const p = u.profile!;
  const bt = batchOf(u); // the batch decides syllabus, exam and tests (Class 12 JEE / NEET / Boards)
  const name = (k: SubjectKey) => SUBJECT_NAME[k][lang];
  const done = u.learn?.done || {};
  const today = istDay(now);

  const attempts = db.attempts.filter((a) => a.userId === u.id && a.status === "submitted").sort((a, b) => (b.submittedAt || "").localeCompare(a.submittedAt || ""));
  const diagnostic = attempts.find((a) => !a.checkpointNo)?.result;
  const keys = subjectsFor(bt.field);
  const weak = (diagnostic?.weak || []).map((w) => subjectFromResult(w, keys)).filter((x): x is SubjectKey => Boolean(x));
  const strong = (diagnostic?.strong || []).map((w) => subjectFromResult(w, keys)).filter((x): x is SubjectKey => Boolean(x));

  const exam = examFor(u, istDay(new Date(enr.paidAt).getTime()));
  const plan = planOf(db, u);
  const { steps: allSteps, start, chapters } = buildSteps(u, enr, weak, exam.date, plan, tasksOf(db, u));
  // Meetings are shown, but are not things to tick off
  const steps = allSteps.filter((s) => s.kind !== "meet");
  const cps = checkpointDates(start, exam.date, plan);
  const nextCpIdx = cps.findIndex((d) => d >= today);
  const cpWindow = (i: number) => [i === 0 ? -Infinity : cps[i - 1], cps[i]] as const;
  const allChapters = Object.values(chaptersFor(bt.cls, bt.field)).flat();
  const chaptersInCp = (i: number) => {
    // the mentor's syllabus for this test, if set
    const set = plan.checkpoints?.[String(i + 1)]?.chapters;
    if (set) return allChapters.filter((c) => set.includes(c.id));
    const [a, b] = cpWindow(i);
    const ids = new Set(steps.filter((s) => s.kind === "practice" && s.chapter && s.date > a && s.date <= b).map((s) => s.chapter!.id));
    return chapters.filter((c) => ids.has(c.id));
  };
  const chapterDone = (c: Chapter) => Boolean(done[`${c.id}:learn`] && done[`${c.id}:practice`]);
  const testChapterIds = new Set(nextCpIdx >= 0 ? chaptersInCp(nextCpIdx).map((c) => c.id) : []);

  const toTask = (s: Step): LearnTask => {
    const t = s.task;
    const sub = (s.chapter?.subject || t?.subject || "") as SubjectKey | "";
    return {
      id: s.id,
      subjectKey: sub,
      subject: sub && SUBJECT_NAME[sub] ? name(sub) : t ? kindLabel(t.kind, lang) : "",
      title: s.chapter?.title || t!.title,
      kind: s.kind,
      minutes: s.minutes,
      done: Boolean(done[s.id]),
      forTest: Boolean(s.chapter && testChapterIds.has(s.chapter.id)),
      dateLabel: fmt(s.date, lang, { weekday: "short", day: "numeric", month: "short" }),
      dateKey: istKey(s.date),
      overdue: s.kind !== "meet" && s.date < today && !done[s.id],
      chapterId: s.chapter?.id,
      mentor: t ? { taskId: t.id, note: t.note, link: t.link, time: t.time, timeLabel: time12(t.time), questions: t.questions, forBatch: t.target.type === "batch" } : undefined,
      moved: Boolean(plan.moved?.[s.id]),
    };
  };

  const weekStart = (t: number) => t - ((istDow(t) + 6) % 7) * DAY;
  const thisWeek = weekStart(today);
  const visibleEnd = lastVisibleWeek(plan, thisWeek) + 7 * DAY; // first day students cannot see

  // Today: anything due today or earlier that is not done (max 3). Ticked-off items from today stay visible.
  // Everything the mentor set for today or earlier, plus up to three syllabus steps
  const due = [...steps.filter((s) => s.task && s.date <= today && !done[s.id]), ...steps.filter((s) => !s.task && s.date <= today && !done[s.id]).slice(0, 3)];
  const doneToday = steps.filter((s) => done[s.id] && istKey(new Date(done[s.id]).getTime()) === istKey(now));
  let todayList = [...doneToday, ...due];
  let ahead = false;
  if (due.length === 0) {
    const next = steps.filter((s) => s.date > today && s.date < visibleEnd && !done[s.id]).slice(0, 2);
    todayList = [...doneToday, ...next];
    ahead = next.length > 0;
  }

  // Roadmap grouped by week (Mon to Sun)
  const weekMap = new Map<number, Step[]>();
  for (const s of allSteps) {
    const w = weekStart(s.date);
    if (!weekMap.has(w)) weekMap.set(w, []);
    weekMap.get(w)!.push(s);
  }
  const allWeekKeys = [...weekMap.keys()].sort((a, b) => a - b);
  const hiddenWeeks = allWeekKeys.filter((w) => w >= visibleEnd).length;
  const weekKeys = admin ? allWeekKeys : allWeekKeys.filter((w) => w < visibleEnd);
  const weeks = weekKeys.map((w, i) => {
    const list = weekMap.get(w)!;
    const cpIdx = cps.findIndex((d) => d >= w && d < w + 7 * DAY);
    const key = istKey(w);
    const ticks = list.filter((s) => s.kind !== "meet");
    return {
      index: i,
      key,
      visible: w < visibleEnd,
      goal: plan.weekGoals?.[key],
      label: `${fmt(w, lang, { day: "numeric", month: "short" })} to ${fmt(w + 6 * DAY, lang, { day: "numeric", month: "short" })}`,
      doneCount: ticks.filter((s) => done[s.id]).length,
      total: ticks.length,
      days: [...new Set(list.map((s) => s.date))].map((d) => ({
        label: d === today ? `${lang === "hi" ? "आज" : "Today"}, ${fmt(d, lang, { weekday: "short", day: "numeric", month: "short" })}` : fmt(d, lang, { weekday: "long", day: "numeric", month: "short" }),
        items: list.filter((s) => s.date === d).map(toTask),
      })),
      checkpoint: cpIdx >= 0 ? cpIdx : undefined,
    };
  });
  let currentWeek = weekKeys.findIndex((w) => w === thisWeek);
  if (currentWeek < 0) currentWeek = weekKeys.findIndex((w) => w > thisWeek);
  if (currentWeek < 0) currentWeek = Math.max(0, weekKeys.length - 1);

  // Week strip for the home page
  const dayList = Array.from({ length: 7 }, (_, i) => thisWeek + i * DAY);
  const doneDays = new Set(Object.values(done).map((iso) => istKey(new Date(iso).getTime())));
  const strip = dayList.map((d) => ({
    day: fmt(d, lang, { weekday: "short" }),
    date: fmt(d, lang, { day: "numeric" }),
    state: cps.includes(d) ? "test" : d === today ? "today" : doneDays.has(istKey(d)) ? "done" : d < today ? "missed" : "next",
  }));

  // Checkpoints
  const fieldInfo = FIELDS[blueprintField(bt.field)];
  const checkpoints = cps.map((d, i) => {
    const list = chaptersInCp(i);
    const att = attempts.find((a) => a.checkpointNo === i + 1);
    const open = d <= today;
    return {
      no: i + 1,
      title: `Checkpoint ${String(i + 1).padStart(2, "0")}`,
      weekday: fmt(d, lang, { weekday: "short" }),
      weekdayLong: fmt(d, lang, { weekday: "long" }),
      day: fmt(d, lang, { day: "numeric" }),
      month: fmt(d, lang, { month: "short" }),
      dateLabel: fmt(d, lang, { weekday: "long", day: "numeric", month: "long" }),
      daysAway: Math.round((d - today) / DAY),
      topics: list.map((c) => ({ id: c.id, title: c.title, subject: name(c.subject), ready: chapterDone(c) })),
      dateKey: istKey(d),
      readyCount: list.filter(chapterDone).length,
      status: att ? ("done" as const) : open ? ("open" as const) : ("upcoming" as const),
      attemptId: att?.id,
      score: att?.result ? Math.round(att.result.percentage) : undefined,
    };
  });
  // The test to show first: an open one not taken yet, otherwise the next upcoming one
  const focusCp = checkpoints.find((c) => c.status === "open") ?? checkpoints.find((c) => c.status === "upcoming");

  const completed = attempts.map((a) => ({
    id: a.id,
    title: a.checkpointNo ? `Checkpoint ${String(a.checkpointNo).padStart(2, "0")}` : lang === "hi" ? `डायग्नोस्टिक टेस्ट ${a.attemptNo}` : `Diagnostic test ${a.attemptNo}`,
    dateLabel: fmt(new Date(a.submittedAt!).getTime(), lang, { day: "numeric", month: "short" }),
    pct: Math.round(a.result!.percentage),
    correct: a.result!.correct,
    total: a.questionIds.length,
  }));

  const meets = allSteps
    .filter((s) => s.kind === "meet" && s.date >= today)
    .map(toTask)
    .slice(0, 3);
  const weekGoal = plan.weekGoals?.[istKey(thisWeek)];

  const doneSteps = steps.filter((s) => done[s.id]).length;
  const overdueCount = steps.filter((s) => s.date < today && !done[s.id]).length;
  const lastDone = Object.values(done).sort().pop();
  const covered = chapters.filter(chapterDone).length;
  const pending = focusCp ? focusCp.topics.filter((x) => !x.ready).length : 0;

  // Doubts
  const doubts = db.doubts
    .filter((d) => d.userId === u.id)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .map((d) => ({
      id: d.id,
      subject: SUBJECT_NAME[d.subject as SubjectKey]?.[lang] || d.subject,
      topic: d.topic,
      status: d.status,
      unread: d.unreadForStudent,
      messages: d.messages.map((m) => ({ ...m, at: fmt(new Date(m.at).getTime(), lang, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) })),
      updated: fmt(new Date(d.updatedAt).getTime(), lang, { day: "numeric", month: "short" }),
    }));

  const seat = seatsOf(db.masterclasses, u).find((x) => !mcIsOver(x.mc) && x.mc.status === "scheduled")?.mc;
  const call = db.bookings.find((b) => b.userId === u.id && b.status === "booked");

  const hourIST = new Date(now + IST).getUTCHours();
  const inProgress = db.attempts.find((a) => a.userId === u.id && a.status === "in_progress");
  return {
    lang,
    openAttemptId: inProgress?.id,
    name: p.name,
    firstName: p.name.split(" ")[0],
    initials: p.name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join(""),
    classLine: `${p.cls === "dropper" ? (lang === "hi" ? "ड्रॉपर" : "Dropper") : `${lang === "hi" ? "कक्षा" : "Class"} ${p.cls}`} · ${p.board}`,
    fieldLabel: batchFieldLabel(bt.field, lang),
    todayLabel: fmt(now, lang, { weekday: "long", day: "numeric", month: "long" }),
    monthLabel: fmt(now, lang, { month: "long" }),
    greeting: hourIST < 12 ? "morning" : hourIST < 17 ? "afternoon" : "evening",
    exam: { name: exam.name[lang], dateLabel: fmt(exam.date, lang, { day: "numeric", month: "long", year: "numeric" }), daysLeft: Math.max(0, Math.round((exam.date - today) / DAY)) },
    prep: { pct: steps.length ? Math.round((doneSteps / steps.length) * 100) : 0, covered, pending, totalChapters: chapters.length, overdueCount, lastDone, doneSteps, totalSteps: steps.length },
    streak: streakOf(done, now),
    today: todayList.map(toTask),
    todayAhead: ahead,
    weeks,
    currentWeek,
    strip,
    subjects: keys.map((k) => ({ key: k, name: name(k) })),
    chapterTitles: Object.fromEntries(keys.map((k) => [k, chaptersFor(bt.cls, bt.field)[k].map((c) => c.title)])) as Record<string, string[]>,
    checkpoints,
    focusCp,
    testInfo: { minutes: fieldInfo.durationMin, questions: totalQuestions(fieldInfo) },
    completed,
    why: { weak: weak.map(name), strong: strong.map(name) },
    doubts,
    unreadDoubts: doubts.filter((d) => d.unread).length,
    notices: noticeItems(db.notifications, u, lang),
    // study material the team attached to this student's chapters
    content: Object.fromEntries(
      chapters
        .filter((c) => db.chapterContent?.[c.id])
        .map((c) => {
          const m = db.chapterContent![c.id];
          return [c.id, { videos: m.videos.map((v) => {
            const id = youtubeId(v.url);
            return { ...v, thumb: id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : undefined };
          }), notes: m.notes, dpp: m.dpp }];
        }),
    ) as Record<string, { videos: { title: string; url: string; thumb?: string }[]; notes: { title: string; url: string }[]; dpp: { pdf?: { title: string; url: string }; questions: { q: string; a?: string }[] } }>,
    meets,
    weekGoal,
    // later weeks the mentor has not shown yet
    hiddenWeeks,
    nextWeekOn: hiddenWeeks ? fmt(visibleEnd, lang, { weekday: "long", day: "numeric", month: "short" }) : undefined,
    masterclass: seat ? { title: seat.title, when: `${fmtMcDate(seat.startsAt, lang)}, ${fmtMcTime(seat.startsAt)}` } : undefined,
    call: call ? { when: fmt(new Date(call.slotStart).getTime(), lang, { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }), link: call.meetingLink } : undefined,
  };
}

/** Can this student tick this step? (a syllabus chapter step, or a mentor task meant for them) */
export function stepExists(u: User, stepId: string, tasks: MentorTask[]) {
  if (!u.profile) return false;
  const p = batchOf(u);
  if (stepId.startsWith("task:")) {
    const t = tasks.find((x) => `task:${x.id}` === stepId);
    return Boolean(t && t.kind !== "meet" && (t.target.type === "student" ? t.target.userId === u.id : t.target.cls === p.cls && t.target.field === p.field));
  }
  const [chapterId, kind] = stepId.split(":");
  if (kind !== "learn" && kind !== "practice") return false;
  return Object.values(chaptersFor(p.cls, p.field)).some((list) => list.some((c) => c.id === chapterId));
}

/** Is checkpoint n open for this student right now (its date has come)? */
export function checkpointOpen(u: User, enr: Enrollment, n: number, plan: PlanEdits, now = Date.now()) {
  const exam = examFor(u, istDay(new Date(enr.paidAt).getTime()));
  const start = istDay(new Date(enr.paidAt).getTime());
  const cps = checkpointDates(start, exam.date, plan);
  const d = cps[n - 1];
  return Boolean(d && d <= istDay(now));
}

export function checkpointDate(u: User, enr: Enrollment, n: number, plan: PlanEdits) {
  const exam = examFor(u, istDay(new Date(enr.paidAt).getTime()));
  return checkpointDates(istDay(new Date(enr.paidAt).getTime()), exam.date, plan)[n - 1];
}

/** Chapter titles in checkpoint n's syllabus (used to pick matching questions). */
export function checkpointChapterTitles(db: DB, u: User, enr: Enrollment, n: number) {
  const d = buildLearnData(db, u, enr, "en", Date.now(), true);
  return d.checkpoints[n - 1]?.topics.map((x) => x.title) || [];
}

/** Short progress summary for the admin panel (undefined if the student has not joined a batch). */
export function learnSummary(db: DB, u: User) {
  const enr = u.profile ? activeEnrollmentOf(u) : undefined;
  if (!enr) return undefined;
  const d = buildLearnData(db, u, enr, "en");
  return {
    pct: d.prep.pct,
    covered: d.prep.covered,
    totalChapters: d.prep.totalChapters,
    overdue: d.prep.overdueCount,
    lastDone: d.prep.lastDone,
    checkpointsTaken: d.checkpoints.filter((c) => c.status === "done").length,
    checkpointsDue: d.checkpoints.filter((c) => c.status === "open").length,
    exam: d.exam,
  };
}
