import "server-only";
import { activeEnrollments, batchOf, batchOfEnrollment } from "./batches";
import { q, q1, tx, isUniqueViolation, type Client } from "./pg";
import { newId, nowISO } from "./ids";
import type {
  Attempt,
  ChapterContent,
  Audience,
  Booking,
  DB,
  Doubt,
  Enrollment,
  Masterclass,
  MasterclassSeat,
  MentorTask,
  Message,
  Notice,
  Otp,
  PlanEdits,
  Question,
  TestPurchase,
  User,
} from "./types";

// All reads and writes to the database go through this file.
// Rule: never load "everything". Every query is for one student, one page of a list, or a count.

const iso = (v: unknown) => (v == null ? undefined : new Date(v as string).toISOString());
const clean = <T extends object>(o: T): T => {
  for (const k of Object.keys(o) as (keyof T)[]) if (o[k] === null || o[k] === undefined) delete o[k];
  return o;
};
const j = (v: unknown) => JSON.stringify(v ?? null);

/* ======================================================================= users */

type UserRow = {
  id: string;
  mobile: string | null;
  email: string | null;
  created_at: Date;
  session_id: string | null;
  profile: User["profile"] | null;
  learn_done: Record<string, string>;
  learn_plan: PlanEdits | null;
  notif_read: string[];
  progress_pct: number | null;
  behind_steps: number | null;
  current_batch: string | null;
  enrollments: Record<string, unknown>[];
  test_purchases: Record<string, unknown>[];
  masterclass_seats: Record<string, unknown>[];
  has_expired: boolean;
};

const USER_SELECT = `
  select u.id, u.mobile, u.email, u.created_at, u.session_id, u.profile, u.learn_done, u.learn_plan, u.notif_read, u.progress_pct, u.behind_steps, u.current_batch,
    coalesce((select json_agg(e order by e.paid_at) from enrollments e where e.user_id = u.id), '[]') as enrollments,
    coalesce((select json_agg(t order by t.paid_at) from test_purchases t where t.user_id = u.id), '[]') as test_purchases,
    coalesce((select json_agg(s order by s.paid_at) from masterclass_seats s where s.user_id = u.id), '[]') as masterclass_seats,
    exists(select 1 from attempts a where a.user_id = u.id and a.status = 'in_progress' and a.expires_at < now() - interval '60 seconds') as has_expired
  from users u`;

function toUser(r: UserRow): User {
  const u: User = {
    id: r.id,
    mobile: r.mobile || "",
    email: r.email || undefined,
    createdAt: iso(r.created_at)!,
    activeSessionId: r.session_id || "",
    profile: r.profile || undefined,
    enrollments: r.enrollments.map(
      (e) =>
        clean({
          id: e.id,
          amount: e.amount,
          paidAt: iso(e.paid_at),
          expiresAt: iso(e.expires_at),
          mode: e.mode,
          paymentId: e.payment_id,
          cls: e.cls,
          field: e.field,
        }) as unknown as Enrollment,
    ),
    currentBatch: r.current_batch || undefined,
    testPurchases: r.test_purchases.map((t) => clean({ id: t.id, amount: t.amount, paidAt: iso(t.paid_at), mode: t.mode }) as unknown as TestPurchase),
    masterclassSeats: r.masterclass_seats.map(
      (s) => clean({ masterclassId: s.masterclass_id, amount: s.amount, paidAt: iso(s.paid_at), mode: s.mode }) as unknown as MasterclassSeat,
    ),
    learn: { done: r.learn_done || {}, plan: r.learn_plan || undefined },
    notifRead: r.notif_read || [],
    progressPct: r.progress_pct ?? undefined,
    behindSteps: r.behind_steps ?? undefined,
    hasExpiredTest: r.has_expired || undefined,
  };
  if (!u.learn!.plan) delete u.learn!.plan;
  return u;
}

export async function getUser(id: string, c?: Client) {
  const r = await q1<UserRow>(`${USER_SELECT} where u.id = $1`, [id], c);
  return r && toUser(r);
}

export async function getUsers(ids: string[]) {
  if (!ids.length) return [];
  return (await q<UserRow>(`${USER_SELECT} where u.id = any($1)`, [ids])).map(toUser);
}

/**
 * Log in by email: create the student on first login, and make this the only active session.
 * An older account that typed this email in its profile (mobile-login days) is taken over, so nothing is lost.
 */
export async function loginUser(email: string, sessionId: string) {
  const old = await q1<{ id: string }>(
    `update users set email = $1, session_id = $2
     where id = (select id from users where email is null and lower(profile->>'email') = $1
                 and not exists (select 1 from users where lower(email) = $1) order by created_at limit 1)
     returning id`,
    [email, sessionId],
  ).catch(() => undefined);
  const r =
    old ||
    (await q1<{ id: string }>(
      `insert into users (id, email, session_id) values ($1, $2, $3)
       on conflict ((lower(email))) do update set session_id = excluded.session_id
       returning id`,
      [newId("u_"), email, sessionId],
    ));
  return (await getUser(r!.id))!;
}

export async function sessionOk(userId: string, sessionId: string) {
  return Boolean(await q1(`select 1 from users where id = $1 and session_id = $2`, [userId, sessionId]));
}

/** Delete a student and all their associated records (admin). */
export async function deleteUser(userId: string) {
  await q(`delete from tasks where target_user = $1`, [userId]);
  await q(`delete from notifications where aud_type = 'student' and aud_user = $1`, [userId]);
  return (await q(`delete from users where id = $1 returning 1`, [userId])).length > 0;
}

/** Save the profile; the mobile number (for calls and WhatsApp reminders) lives in its own column. */
export async function setProfile(userId: string, profile: User["profile"], mobile?: string) {
  if (mobile) await q(`update users set profile = $2, mobile = $3 where id = $1`, [userId, j(profile), mobile]);
  else await q(`update users set profile = $2 where id = $1`, [userId, j(profile)]);
}

/** Tick or untick one roadmap step (safe when two tabs click at once). */
export async function setStepDone(userId: string, stepId: string, done: boolean) {
  if (done)
    await q(`update users set learn_done = learn_done || jsonb_build_object($2::text, $3::text), last_active = now() where id = $1 and not learn_done ? $2`, [userId, stepId, nowISO()]);
  else await q(`update users set learn_done = learn_done - $2::text where id = $1`, [userId, stepId]);
}

/** Tick many steps and untick many steps in one go (admin). */
export async function setStepsDone(userId: string, on: string[], off: string[]) {
  const add = Object.fromEntries(on.map((k) => [k, nowISO()]));
  // existing ticks keep their original time
  await q(`update users set learn_done = ($3::jsonb || (learn_done - $2::text[])) where id = $1`, [userId, off, j(add)]);
}

export async function clearSteps(userId: string) {
  await q(`update users set learn_done = '{}'::jsonb where id = $1`, [userId]);
}

export async function setLearnPlan(userId: string, plan: PlanEdits | undefined) {
  await q(`update users set learn_plan = $2 where id = $1`, [userId, plan ? j(plan) : null]);
}

/** Mark notifications as seen; counts each student once per notification. */
export async function markNoticesRead(userId: string, ids: string[]) {
  if (!ids.length) return;
  await q(
    `with fresh as (
       select distinct x from unnest($2::text[]) x
       where not exists (select 1 from users where id = $1 and notif_read ? x)
     ), upd as (
       update users set notif_read = notif_read || coalesce((select jsonb_agg(x) from fresh), '[]'::jsonb) where id = $1
     )
     update notifications set read_count = read_count + 1 where id in (select x from fresh)`,
    [userId, ids.slice(0, 100)],
  );
}

/** A fresh roadmap drops the dates the mentor moved by hand. */
export async function clearMovedSteps(userIds: string[]) {
  await q(`update users set learn_plan = learn_plan - 'moved' where id = any($1) and learn_plan is not null`, [userIds]);
}

export async function saveProgress(userId: string, pct: number, behind: number, lastActive?: string) {
  await q(`update users set progress_pct = $2, behind_steps = $3, last_active = coalesce($4, last_active), progress_at = now() where id = $1`, [userId, pct, behind, lastActive || null]);
}

/** Students whose saved progress is old (for the hourly refresh). */
export async function staleProgressIds(limit: number) {
  const rows = await q<{ id: string }>(
    `select u.id from users u join enrollments e on e.user_id = u.id and e.expires_at is null
     where u.progress_at is null or u.progress_at < now() - interval '20 hours'
     order by u.progress_at nulls first limit $1`,
    [limit],
  );
  return rows.map((r) => r.id);
}

/** Every student of one batch must have their progress recomputed (after a batch plan change). */
export async function markBatchProgressStale(cls: string, field: string) {
  await q(
    `update users u set progress_at = null from enrollments e
     where e.user_id = u.id and e.expires_at is null and coalesce(e.cls, u.cls) = $1 and coalesce(e.field, u.field) = $2`,
    [cls, field],
  );
}

/* ======================================================================= enrollments, purchases, seats */

/** Returns false if the student already has an active batch (two clicks at once cannot enrol twice). */
export async function addEnrollment(userId: string, e: Enrollment) {
  try {
    await q(`insert into enrollments (id, user_id, amount, paid_at, mode, payment_id, cls, field) values ($1,$2,$3,$4,$5,$6,$7,$8)`, [
      e.id,
      userId,
      e.amount,
      e.paidAt,
      e.mode,
      e.paymentId || null,
      e.cls || null,
      e.field || null,
    ]);
    await q(`update users set current_batch = $2 where id = $1`, [userId, e.id]); // a new batch opens on the dashboard
    return true;
  } catch (err) {
    if (isUniqueViolation(err)) return false;
    throw err;
  }
}

/** Take the student out of one batch (their other batches stay). */
export async function endEnrollment(userId: string, enrollmentId: string) {
  await q(`update enrollments set expires_at = now() where user_id = $1 and id = $2 and expires_at is null`, [userId, enrollmentId]);
  await q(`update users set current_batch = null where id = $1 and current_batch = $2`, [userId, enrollmentId]);
}

/** Which of their batches the student sees on the dashboard. */
export async function setCurrentBatch(userId: string, enrollmentId: string) {
  await q(`update users set current_batch = $2 where id = $1`, [userId, enrollmentId]);
}

/** New roadmap start date. With `batch`, only that batch's enrolment changes (a student can be in several). */
export async function setEnrollmentStart(userIds: string[], paidAt: string, batch?: { cls: string; field: string }) {
  if (batch)
    await q(
      `update enrollments e set paid_at = $2 from users u
       where e.user_id = u.id and e.user_id = any($1) and e.expires_at is null and coalesce(e.cls, u.cls) = $3 and coalesce(e.field, u.field) = $4`,
      [userIds, paidAt, batch.cls, batch.field],
    );
  else await q(`update enrollments set paid_at = $2 where user_id = any($1) and expires_at is null`, [userIds, paidAt]);
}

/** Move one enrolment to another batch (e.g. JEE to Boards PCM). False if the student is already in that batch. */
export async function setEnrollmentTrack(userId: string, enrollmentId: string, cls: string, field: string) {
  try {
    await q(`update enrollments set cls = $3, field = $4 where user_id = $1 and id = $2 and expires_at is null`, [userId, enrollmentId, cls, field]);
    return true;
  } catch (err) {
    if (isUniqueViolation(err)) return false;
    throw err;
  }
}

export async function addTestPurchase(userId: string, t: TestPurchase, paymentId?: string) {
  await q(`insert into test_purchases (id, user_id, amount, paid_at, mode, payment_id) values ($1,$2,$3,$4,$5,$6)`, [t.id, userId, t.amount, t.paidAt, t.mode, paymentId || null]);
}

/** Give every active student of a batch one free test. */
export async function grantTestToBatch(cls: string, field: string) {
  const rows = await q<{ n: string }>(
    `with ins as (
       insert into test_purchases (id, user_id, amount, paid_at, mode)
       select 'tp_' || substr(md5(random()::text || u.id), 1, 12), u.id, 0, now(), 'admin'
       from users u join enrollments e on e.user_id = u.id and e.expires_at is null
       where coalesce(e.cls, u.cls) = $1 and coalesce(e.field, u.field) = $2
       returning 1)
     select count(*) n from ins`,
    [cls, field],
  );
  return Number(rows[0]?.n || 0);
}

export async function addSeat(userId: string, s: MasterclassSeat) {
  await q(`insert into masterclass_seats (masterclass_id, user_id, amount, paid_at, mode) values ($1,$2,$3,$4,$5) on conflict do nothing`, [
    s.masterclassId,
    userId,
    s.amount,
    s.paidAt,
    s.mode,
  ]);
}

export async function removeSeat(userId: string, masterclassId: string) {
  await q(`delete from masterclass_seats where user_id = $1 and masterclass_id = $2`, [userId, masterclassId]);
}

export async function seatCounts() {
  const rows = await q<{ masterclass_id: string; n: string }>(`select masterclass_id, count(*) n from masterclass_seats group by masterclass_id`);
  return new Map(rows.map((r) => [r.masterclass_id, Number(r.n)]));
}

export async function masterclassHasSeats(id: string) {
  return Boolean(await q1(`select 1 from masterclass_seats where masterclass_id = $1 limit 1`, [id]));
}

/* ======================================================================= OTP + rate limits */

export async function getOtp(key: string) {
  const r = await q1<{ key: string; hash: string; expires_at: string; tries: number; sent_at: string }>(`select * from otps where key = $1`, [key]);
  return r && ({ key: r.key, hash: r.hash, expiresAt: Number(r.expires_at), tries: r.tries, sentAt: Number(r.sent_at) } as Otp);
}

export async function putOtp(o: Otp) {
  await q(
    `insert into otps (key, hash, expires_at, tries, sent_at) values ($1,$2,$3,0,$4)
     on conflict (key) do update set hash = excluded.hash, expires_at = excluded.expires_at, tries = 0, sent_at = excluded.sent_at`,
    [o.key, o.hash, o.expiresAt, o.sentAt],
  );
}

export async function bumpOtpTries(key: string) {
  await q(`update otps set tries = tries + 1 where key = $1`, [key]);
}

export async function deleteOtp(key: string) {
  await q(`delete from otps where key = $1`, [key]);
}

/**
 * Fixed-window rate limit shared by every server. Returns true if this hit is allowed.
 * Example: hit("otp:ip:1.2.3.4", 10, 3600_000) = at most 10 per hour.
 */
export async function hit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const r = await q1<{ count: number }>(
    `insert into rate_limits (key, window_start, count) values ($1, $2, 1)
     on conflict (key) do update set
       count = case when rate_limits.window_start <= $2 - $3 then 1 else rate_limits.count + 1 end,
       window_start = case when rate_limits.window_start <= $2 - $3 then $2 else rate_limits.window_start end
     returning count`,
    [key, now, windowMs],
  );
  return (r?.count || 0) <= limit;
}

/** Housekeeping: drop expired OTPs and old rate-limit rows (called by cron). */
export async function cleanupShortLived() {
  await q(`delete from otps where expires_at < $1`, [Date.now() - 3600_000]);
  await q(`delete from rate_limits where window_start < $1`, [Date.now() - 2 * 86400_000]);
}

/* ======================================================================= attempts */

type DocRow = { data: Record<string, unknown> };
const attemptCols = (a: Attempt) => [
  a.id,
  a.userId,
  a.status,
  a.attemptNo,
  a.checkpointNo ?? null,
  a.startedAt,
  a.expiresAt,
  a.submittedAt || null,
  a.result ? a.result.percentage : null,
  j(a),
  a.batchKey || null,
];

export async function getAttempt(id: string) {
  const r = await q1<DocRow>(`select data from attempts where id = $1`, [id]);
  return r?.data as Attempt | undefined;
}

export async function userAttempts(userId: string) {
  return (await q<DocRow>(`select data from attempts where user_id = $1 order by started_at`, [userId])).map((r) => r.data as unknown as Attempt);
}

/** Insert a new attempt. Returns false if the database says no (already an open test, or that attempt number exists). */
export async function insertAttempt(a: Attempt) {
  try {
    await q(
      `insert into attempts (id, user_id, status, attempt_no, checkpoint_no, started_at, expires_at, submitted_at, percentage, data, batch_key)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      attemptCols(a),
    );
    return true;
  } catch (e) {
    if (isUniqueViolation(e)) return false;
    throw e;
  }
}

/**
 * Autosave in ONE query (the hottest write: every student taking a test, every 30 seconds).
 * Saves only if the attempt is this student's, still open, and not past time + grace.
 */
export async function saveAnswers(userId: string, id: string, graceSec: number, patch: { answers: Record<string, string>; marked?: string[]; timeSpent: Record<string, number>; lastSyncAt: string }) {
  const r = await q(
    `update attempts set data = data || $3::jsonb
     where id = $1 and user_id = $2 and status = 'in_progress' and expires_at > now() - make_interval(secs => $4) returning 1`,
    [id, userId, j(clean({ ...patch })), graceSec],
  );
  return r.length > 0;
}

/** Autosave answers of a test that is still open. */
export async function saveOpenAttempt(a: Attempt) {
  const r = await q(`update attempts set data = $2 where id = $1 and status = 'in_progress' returning 1`, [a.id, j(a)]);
  return r.length > 0;
}

/** Submit once: only the first submit (or auto-submit) wins. */
export async function finishAttempt(a: Attempt) {
  const r = await q(
    `update attempts set status = 'submitted', submitted_at = $2, percentage = $3, data = $4 where id = $1 and status = 'in_progress' returning 1`,
    [a.id, a.submittedAt, a.result?.percentage ?? null, j(a)],
  );
  return r.length > 0;
}

export async function expiredOpenAttempts(graceSec: number, limit: number, userId?: string) {
  const rows = await q<DocRow>(
    `select data from attempts where status = 'in_progress' and expires_at < now() - make_interval(secs => $1) ${userId ? "and user_id = $3" : ""} order by expires_at limit $2`,
    userId ? [graceSec, limit, userId] : [graceSec, limit],
  );
  return rows.map((r) => r.data as unknown as Attempt);
}

export async function recentResults(limit: number) {
  const rows = await q<{ data: Attempt; name: string | null }>(
    `select a.data, u.profile->>'name' as name from attempts a join users u on u.id = a.user_id
     where a.status = 'submitted' order by a.submitted_at desc limit $1`,
    [limit],
  );
  return rows.map((r) => ({ attempt: r.data, name: r.name || "" }));
}

/* ======================================================================= questions (cached: read on every test) */

type Cache<T> = { at: number; value: T };
const gc = globalThis as unknown as { __qCache?: Cache<Question[]>; __mcCache?: Cache<Masterclass[]> };
const QUESTION_TTL = 60_000;

export async function allQuestions(): Promise<Question[]> {
  const c = gc.__qCache;
  if (c && Date.now() - c.at < QUESTION_TTL) return c.value;
  const value = (await q<DocRow>(`select data from questions order by id`)).map((r) => r.data as unknown as Question);
  gc.__qCache = { at: Date.now(), value };
  return value;
}

export async function saveQuestions(list: Question[]) {
  if (!list.length) return;
  await q(
    `insert into questions (id, active, data)
     select x->>'id', (x->>'active')::boolean, x from jsonb_array_elements($1::jsonb) x
     on conflict (id) do update set active = excluded.active, data = excluded.data`,
    [j(list)],
  );
  gc.__qCache = undefined;
}

export async function questionCount() {
  return Number((await q1<{ n: string }>(`select count(*) n from questions`))?.n || 0);
}

/* ======================================================================= masterclasses (small, cached) */

const MC_TTL = 20_000;
export async function allMasterclasses(): Promise<Masterclass[]> {
  const c = gc.__mcCache;
  if (c && Date.now() - c.at < MC_TTL) return c.value;
  const value = (await q<DocRow>(`select data from masterclasses order by starts_at`)).map((r) => r.data as unknown as Masterclass);
  gc.__mcCache = { at: Date.now(), value };
  return value;
}

export async function saveMasterclass(m: Masterclass) {
  await q(`insert into masterclasses (id, starts_at, data) values ($1,$2,$3) on conflict (id) do update set starts_at = excluded.starts_at, data = excluded.data`, [
    m.id,
    m.startsAt,
    j(m),
  ]);
  gc.__mcCache = undefined;
}

export async function deleteMasterclasses(ids: string[]) {
  await q(`delete from masterclasses where id = any($1)`, [ids]);
  gc.__mcCache = undefined;
}

/* ======================================================================= bookings */

const bookingCols = (b: Booking) => [b.id, b.userId, b.slotStart, b.status, j(b)];

export async function getBooking(id: string) {
  return (await q1<DocRow>(`select data from bookings where id = $1`, [id]))?.data as Booking | undefined;
}

export async function userBookings(userId: string) {
  return (await q<DocRow>(`select data from bookings where user_id = $1 order by slot_start`, [userId])).map((r) => r.data as unknown as Booking);
}

export async function saveBooking(b: Booking, c?: Client) {
  await q(
    `insert into bookings (id, user_id, slot_start, status, data) values ($1,$2,$3,$4,$5)
     on conflict (id) do update set slot_start = excluded.slot_start, status = excluded.status, data = excluded.data`,
    bookingCols(b),
    c,
  );
}

/** How many active bookings each slot has, for the next days (for the slot picker). */
export async function slotCounts(fromIso: string, toIso: string) {
  const rows = await q<{ t: Date; n: string }>(
    `select slot_start t, count(*) n from bookings where status <> 'cancelled' and slot_start between $1 and $2 group by slot_start`,
    [fromIso, toIso],
  );
  return new Map(rows.map((r) => [new Date(r.t).getTime().toString(), Number(r.n)]));
}

/**
 * Book a slot without ever going over capacity, even if many students click the same slot at the same second.
 * Cancels the student's previous booking in the same step. Returns the old booking (if any) or "full".
 */
export async function bookSlot(b: Booking, capacity: number): Promise<{ ok: true; old?: Booking } | { ok: false }> {
  return tx(async (c) => {
    await c.query(`select pg_advisory_xact_lock(hashtext($1))`, [`slot:${new Date(b.slotStart).getTime()}`]);
    await c.query(`select pg_advisory_xact_lock(hashtext($1))`, [`user-booking:${b.userId}`]);
    const n = await q1<{ n: string }>(`select count(*) n from bookings where status <> 'cancelled' and slot_start = $1`, [b.slotStart], c);
    if (Number(n?.n || 0) >= capacity) return { ok: false as const };
    const oldRow = await q1<DocRow>(`select data from bookings where user_id = $1 and status = 'booked' limit 1`, [b.userId], c);
    let old: Booking | undefined;
    if (oldRow) {
      old = { ...(oldRow.data as unknown as Booking), status: "cancelled", updatedAt: nowISO() };
      await saveBooking(old, c);
    }
    await saveBooking(b, c);
    return { ok: true as const, old };
  });
}

/** Bookings that may need a reminder now (calls in the next ~24 hours). */
export async function bookingsNeedingReminders(withinMs: number) {
  const rows = await q<DocRow>(`select data from bookings where status = 'booked' and slot_start > now() and slot_start < now() + make_interval(secs => $1)`, [withinMs / 1000]);
  return rows.map((r) => r.data as unknown as Booking);
}

/** Mark reminders as sent, only if nobody else did it first (several servers may run the same job). */
export async function claimReminders(id: string, before: string[], after: string[]) {
  const r = await q(
    `update bookings set data = jsonb_set(data, '{remindersSent}', $3::jsonb)
     where id = $1 and coalesce(data->'remindersSent', '[]'::jsonb) = $2::jsonb returning 1`,
    [id, j(before), j(after)],
  );
  return r.length > 0;
}

/* ======================================================================= messages log */

export async function addMessage(m: Message) {
  await q(`insert into messages (id, at, data) values ($1,$2,$3)`, [m.id, m.at, j(m)]);
}

export async function recentMessages(limit: number) {
  return (await q<DocRow>(`select data from messages order by at desc limit $1`, [limit])).map((r) => r.data as unknown as Message);
}

/* ======================================================================= doubts */

const doubtCols = (d: Doubt) => [d.id, d.userId, d.status, d.subject, d.updatedAt, j(d)];

export async function getDoubt(id: string) {
  return (await q1<DocRow>(`select data from doubts where id = $1`, [id]))?.data as Doubt | undefined;
}

export async function userDoubts(userId: string) {
  return (await q<DocRow>(`select data from doubts where user_id = $1 order by updated_at desc`, [userId])).map((r) => r.data as unknown as Doubt);
}

export async function insertDoubt(d: Doubt) {
  await q(`insert into doubts (id, user_id, status, subject, updated_at, data) values ($1,$2,$3,$4,$5,$6)`, doubtCols(d));
}

/** Add a message to a doubt and change its status in one step (a student and a mentor writing at once both get saved). */
export async function addDoubtMessage(id: string, msg: Doubt["messages"][number], patch: Partial<Pick<Doubt, "status" | "unreadForStudent">>) {
  const at = nowISO();
  await q(
    `update doubts set
       status = coalesce($3, status), updated_at = $4,
       data = jsonb_set(data, '{messages}', coalesce(data->'messages', '[]'::jsonb) || $2::jsonb) || $5::jsonb
     where id = $1`,
    [id, j([msg]), patch.status || null, at, j({ ...patch, updatedAt: at })],
  );
}

export async function patchDoubt(id: string, patch: Partial<Pick<Doubt, "status" | "unreadForStudent">>, touch = true) {
  const at = nowISO();
  await q(`update doubts set status = coalesce($2, status), updated_at = case when $4 then $3::timestamptz else updated_at end, data = data || $5::jsonb where id = $1`, [
    id,
    patch.status || null,
    at,
    touch,
    j(touch ? { ...patch, updatedAt: at } : patch),
  ]);
}

export async function openDoubtCount() {
  return Number((await q1<{ n: string }>(`select count(*) n from doubts where status = 'open'`))?.n || 0);
}

/* ======================================================================= notifications */

export async function insertNotice(n: Notice) {
  const a = n.audience;
  await q(`insert into notifications (id, created_at, aud_type, aud_cls, aud_field, aud_user, data) values ($1,$2,$3,$4,$5,$6,$7)`, [
    n.id,
    n.createdAt,
    a.type,
    a.type === "class" || a.type === "batch" ? a.cls || null : null,
    a.type === "batch" ? a.field || null : null,
    a.type === "student" ? a.userId : null,
    j(n),
  ]);
}

export async function deleteNotice(id: string) {
  return (await q(`delete from notifications where id = $1 returning 1`, [id])).length > 0;
}

export async function sentNotices(limit: number, offset: number) {
  const rows = await q<{ data: Notice; read_count: number }>(`select data, read_count from notifications order by created_at desc limit $1 offset $2`, [limit, offset]);
  return rows.map((r) => ({ ...r.data, readCount: r.read_count }));
}

export async function noticeCount() {
  return Number((await q1<{ n: string }>(`select count(*) n from notifications`))?.n || 0);
}

/** Notifications meant for this student (latest 50). */
export async function noticesForUser(u: User, enrolled: boolean) {
  const p = u.profile;
  // batch notices go by the batches (Class 12 JEE / NEET / Boards), not the profile; a student can be in several
  const bs = p ? activeEnrollments(u).map((e) => batchOfEnrollment(e, u)) : [];
  const rows = await q<DocRow>(
    `select data from notifications where
       (aud_type = 'student' and aud_user = $1)
       or (created_at >= $2 and $3::text is not null and (
            aud_type = 'all'
         or (aud_type = 'class' and aud_cls = $3)
         or (aud_type = 'batch' and $5 and exists (
              select 1 from unnest($6::text[], $4::text[]) as b(c, f)
              where (aud_cls is null or aud_cls = b.c) and (aud_field is null or aud_field = b.f)))))
     order by created_at desc limit 50`,
    [u.id, u.createdAt, p?.cls || null, bs.map((b) => b.field), enrolled, bs.map((b) => b.cls)],
  );
  return rows.map((r) => r.data as unknown as Notice);
}

/** How many students an audience reaches right now. */
export async function audienceSize(a: Audience) {
  let sql = "";
  const params: unknown[] = [];
  if (a.type === "student") (sql = `select count(*) n from users where id = $1`), params.push(a.userId);
  else if (a.type === "all") sql = `select count(*) n from users where profile is not null`;
  else if (a.type === "class") (sql = `select count(*) n from users where cls = $1`), params.push(a.cls);
  else {
    sql = `select count(*) n from users u join enrollments e on e.user_id = u.id and e.expires_at is null where ($1::text is null or coalesce(e.cls, u.cls) = $1) and ($2::text is null or coalesce(e.field, u.field) = $2)`;
    params.push(a.cls || null, a.field || null);
  }
  return Number((await q1<{ n: string }>(sql, params))?.n || 0);
}

/* ======================================================================= mentor tasks + batch plans */

const taskCols = (t: MentorTask) => [
  t.id,
  t.target.type === "student" ? t.target.userId : null,
  t.target.type === "batch" ? t.target.cls : null,
  t.target.type === "batch" ? t.target.field : null,
  t.date,
  j(t),
];

export async function saveTask(t: MentorTask) {
  await q(
    `insert into tasks (id, target_user, target_cls, target_field, date, data) values ($1,$2,$3,$4,$5,$6)
     on conflict (id) do update set date = excluded.date, data = excluded.data`,
    taskCols(t),
  );
}

export async function getTask(id: string) {
  return (await q1<DocRow>(`select data from tasks where id = $1`, [id]))?.data as MentorTask | undefined;
}

export async function deleteTask(id: string) {
  return (await q(`delete from tasks where id = $1 returning 1`, [id])).length > 0;
}

export async function tasksForUsers(ids: string[], batches: { cls: string; field: string }[]) {
  const rows = await q<DocRow>(
    `select data from tasks where target_user = any($1)
       or (target_user is null and (target_cls, target_field) in (select * from unnest($2::text[], $3::text[])))`,
    [ids, batches.map((b) => b.cls), batches.map((b) => b.field)],
  );
  return rows.map((r) => r.data as unknown as MentorTask);
}

export async function batchTasks(cls: string, field: string) {
  return (await q<DocRow>(`select data from tasks where target_user is null and target_cls = $1 and target_field = $2 order by date`, [cls, field])).map(
    (r) => r.data as unknown as MentorTask,
  );
}

export async function getBatchPlans(keys: string[]) {
  const rows = await q<{ key: string; data: PlanEdits }>(`select key, data from batch_plans where key = any($1)`, [keys]);
  return Object.fromEntries(rows.map((r) => [r.key, r.data])) as Record<string, PlanEdits>;
}

export async function saveBatchPlan(key: string, plan: PlanEdits) {
  await q(`insert into batch_plans (key, data) values ($1,$2) on conflict (key) do update set data = excluded.data`, [key, j(plan)]);
}

/* ======================================================================= study material (small, cached) */

const gcc = globalThis as unknown as { __ccCache?: { at: number; value: Record<string, ChapterContent> } };
export async function allChapterContent(): Promise<Record<string, ChapterContent>> {
  const c = gcc.__ccCache;
  if (c && Date.now() - c.at < 60_000) return c.value;
  const rows = await q<{ chapter_id: string; data: ChapterContent }>(`select chapter_id, data from chapter_content`);
  const value = Object.fromEntries(rows.map((r) => [r.chapter_id, r.data]));
  gcc.__ccCache = { at: Date.now(), value };
  return value;
}

export async function saveChapterContent(chapterId: string, data: ChapterContent | undefined) {
  if (!data) await q(`delete from chapter_content where chapter_id = $1`, [chapterId]);
  else
    await q(`insert into chapter_content (chapter_id, updated_at, data) values ($1, now(), $2) on conflict (chapter_id) do update set updated_at = now(), data = excluded.data`, [
      chapterId,
      j(data),
    ]);
  gcc.__ccCache = undefined;
}

/* ======================================================================= settings */

export async function getSetting<T>(key: string) {
  return (await q1<{ data: T }>(`select data from settings where key = $1`, [key]))?.data;
}

export async function setSetting(key: string, data: unknown) {
  if (data === undefined) await q(`delete from settings where key = $1`, [key]);
  else await q(`insert into settings (key, data) values ($1,$2) on conflict (key) do update set data = excluded.data`, [key, j(data)]);
}

/* ======================================================================= one student's world */

/**
 * Everything the student pages need, for a few students only, in the old in-memory shape
 * so the roadmap and result code can stay simple. Never call this for "all students".
 */
export async function scopeFor(userIds: string[], opts: { notices?: boolean; users?: User[] } = {}): Promise<DB> {
  // Pass `users` when the page already loaded them: saves one database round trip.
  const users = opts.users || (await getUsers(userIds));
  const first = users[0];
  const noticesP =
    opts.notices && first
      ? noticesForUser(first, (first.enrollments || []).some((e) => !e.expiresAt || new Date(e.expiresAt).getTime() > Date.now()))
      : Promise.resolve([] as Notice[]);
  const batches = users.filter((u) => u.profile).map((u) => batchOf(u)); // Class 12 Science: the JEE / NEET / Boards batch
  const keys = [...new Set(batches.map((b) => `${b.cls}|${b.field}`))];
  const [attempts, bookings, doubts, tasks, batchPlans, masterclasses, chapterContent, notifications] = await Promise.all([
    q<DocRow>(`select data from attempts where user_id = any($1) order by started_at`, [userIds]),
    q<DocRow>(`select data from bookings where user_id = any($1) order by slot_start`, [userIds]),
    q<DocRow>(`select data from doubts where user_id = any($1) order by updated_at desc`, [userIds]),
    tasksForUsers(userIds, batches),
    getBatchPlans(keys),
    allMasterclasses(),
    allChapterContent(),
    noticesP,
  ]);
  return {
    users,
    otps: [],
    attempts: attempts.map((r) => r.data as unknown as Attempt),
    bookings: bookings.map((r) => r.data as unknown as Booking),
    questions: [],
    messages: [],
    masterclasses,
    doubts: doubts.map((r) => r.data as unknown as Doubt),
    notifications,
    tasks,
    batchPlans,
    chapterContent,
  };
}

export { newId, nowISO };
