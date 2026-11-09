import "server-only";
import crypto from "crypto";
import {
  FIELDS,
  FREE_ATTEMPTS,
  INTERESTS,
  favouriteOptions,
  sectionsFor,
  SUBMIT_GRACE_SEC,
  type FieldId,
  type InterestTag,
  type Part,
} from "./config";
import { newId, nowISO } from "./ids";
import { batchOf, blueprintField, isTrack, TRACKS } from "./batches";
import { allQuestions, expiredOpenAttempts, finishAttempt, insertAttempt, userAttempts } from "./store";
import type { Attempt, PublicQuestion, Question, Result, SectionScore, User } from "./types";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const words = (s: string) => new Set(s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter((w) => w.length > 2 && !["and", "the", "its", "of"].includes(w)));
/** Does a question's chapter name match one of these syllabus chapter titles? */
function inSyllabus(chapter: string, titles: Set<string>[]) {
  const c = words(chapter);
  if (!c.size) return false;
  return titles.some((t) => {
    let same = 0;
    for (const w of c) if (t.has(w)) same++;
    return same / Math.min(c.size, t.size) >= 0.6;
  });
}

/** Question-set rotation: prefer questions this student has never seen (and, for a checkpoint, from its syllabus). */
function pickQuestions(
  questions: Question[],
  past: Attempt[],
  field: FieldId,
  syllabus: string[] = [],
  favourite?: string,
  level?: "competitive" | "board",
): Question[] {
  const titles = syllabus.map(words);
  const seen = new Map<string, number>();
  for (const a of past) for (const q of a.questionIds) seen.set(q, (seen.get(q) || 0) + 1);
  const picked: Question[] = [];
  for (const s of sectionsFor(FIELDS[field], favourite)) {
    const pool = questions.filter((q) => q.active && q.subject === s.subject && q.part === s.part);
    // random order, then syllabus chapters first, then least-seen first
    // Class 12 batches: JEE / NEET tests lean to medium and hard questions, Boards tests to easy and medium
    const off = (q: Question) => (level === "competitive" ? (q.difficulty === "easy" ? 3 : 0) : level === "board" ? (q.difficulty === "hard" ? 3 : 0) : 0);
    const rank = (q: Question) => (titles.length && !inSyllabus(q.chapter, titles) ? 1000 : 0) + off(q) + (seen.get(q.id) || 0);
    const ordered = shuffle(pool).sort((x, y) => rank(x) - rank(y));
    picked.push(...ordered.slice(0, s.count));
  }
  return picked;
}

/** Free or paid tests used (pass this student's attempts). Batch checkpoint tests are not counted. */
export function attemptsUsed(attempts: Attempt[]) {
  return attempts.filter((a) => !a.checkpointNo).length;
}

/** Free attempts plus every paid test the student has bought. */
function attemptsAllowed(user: User) {
  return FREE_ATTEMPTS + (user.testPurchases?.length || 0);
}

/** Tests the student can still start right now (free or already paid for). */
export function attemptsLeft(user: User, attempts: Attempt[]) {
  return Math.max(0, attemptsAllowed(user) - attemptsUsed(attempts));
}

/**
 * Start a test, or return the one already open.
 * Safe under load: the database refuses a second open test or a repeated attempt number,
 * so double clicks, two tabs and retries all end up on the same attempt.
 */
export async function startOrResumeAttempt(user: User, opts: { checkpointNo?: number; chapters?: string[]; favSubject?: string } = {}) {
  if (!user.profile) return { error: "Please complete your profile first." };
  await finalizeFor(user);

  for (let tryNo = 0; tryNo < 3; tryNo++) {
    const past = await userAttempts(user.id);
    const open = past.find((a) => a.status === "in_progress");
    if (open) return { attempt: open };
    // Checkpoint tests belong to the batch open on the dashboard (a student can be in several batches)
    const bt = opts.checkpointNo ? batchOf(user) : undefined;
    const key = bt ? `${bt.cls}|${bt.field}` : undefined;
    if (opts.checkpointNo && past.some((a) => a.checkpointNo === opts.checkpointNo && (a.batchKey ?? key) === key)) return { error: "You have already taken this test." };
    if (!opts.checkpointNo && attemptsLeft(user, past) <= 0) {
      return { error: "You have used all free attempts. The next test costs ₹49." };
    }

    // Batch tests use the batch's pattern (Class 12 JEE / NEET / Boards); the free test uses the student's own field
    const track = bt?.field;
    const field = track ? blueprintField(track) : user.profile.field;
    const level = track && isTrack(track) ? (TRACKS[track].competitive ? "competitive" : "board") : undefined;
    // Favourite subject only shapes the diagnostic test; batch checkpoints keep the even split
    const fav = !opts.checkpointNo && favouriteOptions(FIELDS[field]).includes(opts.favSubject || "") ? opts.favSubject : undefined;
    if (!opts.checkpointNo && FIELDS[field].favourite && !fav) return { error: "Pick your favourite subject first.", needFav: true };
    const qs = pickQuestions(await allQuestions(), past, field, opts.chapters, fav, level);
    if (qs.length === 0) return { error: "No questions available for your field yet." };

    const used = attemptsUsed(past);
    const start = new Date();
    const attempt: Attempt = {
      id: newId("t_"),
      userId: user.id,
      field,
      cls: user.profile.cls,
      attemptNo: opts.checkpointNo ? 0 : used + 1,
      paid: !opts.checkpointNo && used + 1 > FREE_ATTEMPTS,
      checkpointNo: opts.checkpointNo,
      batchKey: key,
      favSubject: fav,
      questionIds: qs.map((q) => q.id),
      optionOrder: Object.fromEntries(qs.map((q) => [q.id, shuffle(q.options.map((o) => o.id))])),
      startedAt: start.toISOString(),
      expiresAt: new Date(start.getTime() + FIELDS[field].durationMin * 60_000).toISOString(),
      answers: {},
      marked: [],
      timeSpent: {},
      status: "in_progress",
    };
    if (await insertAttempt(attempt)) return { attempt };
    // Another request started one at the same moment: loop and pick that one up.
  }
  return { error: "Please try again." };
}

/** Questions for the browser: no answer key, options in this attempt's order. */
export async function publicQuestions(attempt: Attempt): Promise<PublicQuestion[]> {
  const byId = new Map((await allQuestions()).map((q) => [q.id, q]));
  return attempt.questionIds
    .map((id) => byId.get(id))
    .filter((q): q is Question => Boolean(q))
    .map((q) => {
      const order = attempt.optionOrder[q.id] || q.options.map((o) => o.id);
      const opts = order
        .map((oid) => q.options.find((o) => o.id === oid))
        .filter((o): o is NonNullable<typeof o> => Boolean(o))
        .map((o) => ({ id: o.id, en: o.en, hi: o.hi }));
      return { id: q.id, part: q.part, subject: q.subject, text: q.text, options: opts };
    });
}

/** Keeps only answers that belong to this attempt and are valid option ids. */
export async function cleanAnswers(attempt: Attempt, answers: unknown): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  if (!answers || typeof answers !== "object") return out;
  const allowed = new Set(attempt.questionIds);
  const byId = new Map((await allQuestions()).map((q) => [q.id, q]));
  for (const [qid, oid] of Object.entries(answers as Record<string, unknown>)) {
    if (!allowed.has(qid) || typeof oid !== "string") continue;
    if (byId.get(qid)?.options.some((o) => o.id === oid)) out[qid] = oid;
  }
  return out;
}

/** Same check without reading the attempt first: answers must be real questions and real options. */
export async function cleanAnswersFast(answers: unknown): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  if (!answers || typeof answers !== "object") return out;
  const byId = await questionIndex();
  let n = 0;
  for (const [qid, oid] of Object.entries(answers as Record<string, unknown>)) {
    if (++n > 200 || typeof oid !== "string") continue;
    if (byId.get(qid)?.has(oid)) out[qid] = oid;
  }
  return out;
}

const gi = globalThis as unknown as { __qIndex?: { from: Question[]; map: Map<string, Set<string>> } };
async function questionIndex() {
  const list = await allQuestions();
  if (gi.__qIndex?.from !== list) gi.__qIndex = { from: list, map: new Map(list.map((q) => [q.id, new Set(q.options.map((o) => o.id))])) };
  return gi.__qIndex.map;
}

export function cleanTimes(attempt: Attempt, times: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (!times || typeof times !== "object") return out;
  const allowed = new Set(attempt.questionIds);
  for (const [qid, t] of Object.entries(times as Record<string, unknown>)) {
    if (allowed.has(qid) && typeof t === "number" && t >= 0 && t < 36000) out[qid] = Math.round(t);
  }
  return out;
}

export function isExpired(a: Attempt, graceSec = SUBMIT_GRACE_SEC) {
  return Date.now() > new Date(a.expiresAt).getTime() + graceSec * 1000;
}

function pct(c: number, t: number) {
  return t === 0 ? 0 : Math.round((c / t) * 1000) / 10;
}

function levelFor(p: number): Result["level"] {
  if (p >= 80) return "Advanced";
  if (p >= 60) return "Strong";
  if (p >= 40) return "Developing";
  return "Beginner";
}

function scoreAttempt(questions: Question[], attempt: Attempt): Result {
  const byId = new Map(questions.map((q) => [q.id, q]));
  const qs = attempt.questionIds.map((id) => byId.get(id)).filter((q): q is Question => Boolean(q));

  const parts = new Map<Part, { c: number; t: number }>();
  const subjects = new Map<string, { c: number; t: number }>();
  const topics = new Map<string, { subject: string; topic: string; c: number; t: number }>();
  const interests: Partial<Record<InterestTag, number>> = {};
  let correct = 0,
    wrong = 0,
    unanswered = 0,
    scored = 0;

  for (const q of qs) {
    const given = attempt.answers[q.id];
    if (q.part === "C") {
      const tag = q.options.find((o) => o.id === given)?.tag;
      if (tag) interests[tag] = (interests[tag] || 0) + 1;
      continue;
    }
    scored++;
    const ok = given !== undefined && given === q.answer;
    if (given === undefined) unanswered++;
    else if (ok) correct++;
    else wrong++;

    const p = parts.get(q.part) || { c: 0, t: 0 };
    p.t++;
    if (ok) p.c++;
    parts.set(q.part, p);

    const s = subjects.get(q.subject) || { c: 0, t: 0 };
    s.t++;
    if (ok) s.c++;
    subjects.set(q.subject, s);

    const tk = `${q.subject}|${q.topic}`;
    const t = topics.get(tk) || { subject: q.subject, topic: q.topic, c: 0, t: 0 };
    t.t++;
    if (ok) t.c++;
    topics.set(tk, t);
  }

  const toScore = (key: string, v: { c: number; t: number }): SectionScore => ({
    key,
    correct: v.c,
    total: v.t,
    pct: pct(v.c, v.t),
  });

  const subjectScores = [...subjects].map(([k, v]) => toScore(k, v));
  const percentage = pct(correct, scored);
  const totalTimeSec = Object.values(attempt.timeSpent).reduce((a, b) => a + b, 0);
  const attempted = correct + wrong;

  const topInterest = (Object.entries(interests) as [InterestTag, number][]).sort((a, b) => b[1] - a[1])[0]?.[0];

  const result: Result = {
    scoredTotal: scored,
    correct,
    wrong,
    unanswered,
    percentage,
    accuracy: pct(correct, attempted),
    totalTimeSec,
    avgTimeSec: qs.length ? Math.round(totalTimeSec / qs.length) : 0,
    level: levelFor(percentage),
    parts: [...parts].map(([k, v]) => toScore(k, v)),
    subjects: subjectScores,
    topics: [...topics.values()].map((t) => ({ ...toScore(t.topic, t), subject: t.subject })),
    strong: subjectScores.filter((s) => s.pct >= 70).map((s) => s.key),
    weak: subjectScores.filter((s) => s.pct < 50).map((s) => s.key),
    weakTopics: [...topics.values()].filter((t) => t.c < t.t).map((t) => `${t.subject}: ${t.topic}`),
    interests,
    topInterest,
  };

  if (attempt.field === "foundation10") result.streamRecommendation = recommendStream(result);
  return result;
}

/** Class 10: suggest a stream from subject scores + interests. A starting point for the counsellor. */
function recommendStream(r: Result): string {
  const s = (name: string) => r.subjects.find((x) => x.key === name)?.pct ?? 0;
  const maths = s("Maths (Class 10)");
  const bio = s("Biology (Class 10)");
  const physChem = (s("Physics (Class 10)") + s("Chemistry (Class 10)")) / 2;
  const science = (s("Physics (Class 10)") + s("Chemistry (Class 10)") + bio) / 3;
  const interest = r.topInterest;
  if (interest === "health" && bio >= 50 && physChem >= 40) return "Science: PCB";
  if (interest === "tech" && maths >= 50 && physChem >= 50) return "Science: PCM";
  if (interest === "business") return maths >= 50 ? "Commerce with Maths" : "Commerce without Maths";
  if (maths >= 60 && science >= 60) return "Science: PCMB (keeps both options open)";
  if (maths >= 60 && physChem >= 60) return "Science: PCM";
  if (bio >= 60 && physChem >= 50) return "Science: PCB";
  if (maths >= 50) return "Commerce with Maths";
  if (interest === "people") return `Commerce without Maths (strong interest in ${INTERESTS.people.en})`;
  return "Commerce without Maths";
}

/** Score and submit. Only the first submit counts (a second click or the auto-submit does nothing). */
export async function submitAttempt(attempt: Attempt, auto: boolean) {
  const done: Attempt = { ...attempt, status: "submitted", submittedAt: nowISO(), autoSubmitted: auto };
  done.result = scoreAttempt(await allQuestions(), done);
  await finishAttempt(done);
  return done;
}

/**
 * Auto-submit tests whose timer ran out (no cron needed for one student).
 * Without a student id it handles a batch of the oldest ones (the cron job calls this).
 */
/** Auto-submit this student's timed-out test, but only when the user row says one exists (no extra query otherwise). */
export async function finalizeFor(user: User) {
  if (!user.hasExpiredTest) return 0;
  user.hasExpiredTest = undefined;
  return finalizeExpired(user.id);
}

export async function finalizeExpired(userId?: string) {
  const expired = await expiredOpenAttempts(SUBMIT_GRACE_SEC, userId ? 5 : 500, userId);
  for (const a of expired) await submitAttempt(a, true);
  return expired.length;
}
