import { batchLabel, batchOfEnrollment, isTrack, type BatchField } from "./batches";
import "server-only";
import { FIELDS, type ClassLevel, type FieldId } from "./config";
import { q, q1 } from "./pg";
import type { Attempt, Booking, Doubt, Masterclass, Profile, Result } from "./types";

// Admin lists. Everything here is one SQL query for one page (50 rows) or a count.
// Nothing loads all students into memory, so these pages stay fast with lakhs of students.

export const PAGE = 50;

export type StudentRow = {
  id: string;
  name: string;
  mobile: string;
  email: string;
  cls: string;
  field: string;
  fieldLabel: string;
  city: string;
  school: string;
  board: string;
  goal: string;
  createdAt: string;
  attempts: number;
  best?: number;
  latest?: Result;
  callStatus: "none" | Booking["status"];
  callAt?: string;
  batch: "none" | "active" | "demo" | "admin";
  batchName?: string; // e.g. "Class 12 JEE"
  progress?: number;
  behind?: number;
  lastActive?: string;
  batchJoined?: string;
  batchAmount?: number;
  paidTests: number;
  paidTestAmount: number;
};

export type Filters = { cls?: string; field?: string; band?: string; city?: string; call?: string; q?: string; batch?: string; sort?: string; page?: string };

type Row = {
  id: string;
  mobile: string | null;
  email: string | null;
  created_at: Date;
  profile: Profile;
  progress_pct: number | null;
  behind_steps: number | null;
  last_active: Date | null;
  e_mode: string | null;
  e_amount: number | null;
  e_paid: Date | null;
  e_cls: string | null;
  e_field: string | null;
  e_all: string | null;
  latest: Result | null;
  attempts: string;
  best: string | null;
  call_status: string | null;
  call_at: Date | null;
  paid_tests: string;
  paid_amount: string | null;
};

const iso = (d: Date | null) => (d ? new Date(d).toISOString() : undefined);

/** Builds the WHERE part of the students query from the filters. Values always go as $n parameters. */
function where(f: Filters) {
  const w: string[] = ["u.profile is not null"];
  const p: unknown[] = [];
  const add = (sql: string, v: unknown) => {
    p.push(v);
    w.push(sql.replace("?", `$${p.length}`));
  };
  if (f.cls) add("u.cls = ?", f.cls);
  // a Class 12 track (jee, neet, boards_*) filters by batch; anything else by the profile's field
  // (a student can be in several batches: any of them matches)
  if (f.field) add(isTrack(f.field) ? "exists (select 1 from enrollments ex where ex.user_id = u.id and ex.expires_at is null and ex.field = ?)" : "u.field = ?", f.field);
  if (f.city) add("u.city_lc like ?", `%${f.city.toLowerCase()}%`);
  if (f.q) {
    const v = `%${f.q.toLowerCase()}%`;
    p.push(v);
    w.push(`(u.name_lc like $${p.length} or u.mobile like $${p.length} or lower(u.email) like $${p.length} or lower(u.profile->>'school') like $${p.length})`);
  }
  if (f.batch === "none") w.push("e.id is null");
  else if (f.batch === "paid") w.push("e.id is not null");
  else if (f.batch === "behind") w.push("e.id is not null and u.behind_steps > 0");
  if (f.call === "none") w.push("lb.status is null");
  else if (f.call) add("lb.status = ?", f.call);
  if (f.band === "none") w.push("la.percentage is null");
  else if (f.band && /^\d+-\d+$/.test(f.band)) {
    const [lo, hi] = f.band.split("-").map(Number);
    add("la.percentage >= ?", lo);
    add("la.percentage <= ?", hi + 0.999);
  }
  return { sql: w.join(" and "), params: p };
}

const ORDER: Record<string, string> = {
  new: "u.created_at desc",
  behind: "u.behind_steps desc nulls last, u.created_at desc",
  progress: "u.progress_pct asc nulls last, u.created_at desc",
  name: "u.name_lc asc",
  active: "u.last_active desc nulls last",
};

const FROM = `
  from users u
  left join lateral (select id, mode, amount, paid_at, cls, field from enrollments e where e.user_id = u.id and e.expires_at is null
                     order by (e.id = u.current_batch) desc, e.paid_at desc limit 1) e on true
  left join lateral (select percentage, data->'result' as result from attempts a where a.user_id = u.id and a.status = 'submitted' order by submitted_at desc limit 1) la on true
  left join lateral (select status, slot_start from bookings b where b.user_id = u.id and b.status <> 'cancelled' order by slot_start desc limit 1) lb on true`;

function nameOfBatch(cls: string, field: string) {
  const b = batchOfEnrollment({ cls: cls as ClassLevel, field: field as BatchField });
  return batchLabel(b.cls, b.field);
}

function toRow(r: Row): StudentRow {
  const p = r.profile;
  return {
    id: r.id,
    name: p.name,
    mobile: r.mobile || "",
    email: r.email || "",
    cls: p.cls,
    field: p.field,
    fieldLabel: FIELDS[p.field as FieldId]?.label.en || p.field,
    city: p.city,
    school: p.school,
    board: p.board,
    goal: p.targetGoal,
    createdAt: iso(r.created_at)!,
    attempts: Number(r.attempts),
    best: r.best == null ? undefined : Number(r.best),
    latest: r.latest || undefined,
    callStatus: (r.call_status as StudentRow["callStatus"]) || "none",
    callAt: iso(r.call_at),
    batch: !r.e_mode ? "none" : r.e_mode === "demo" ? "demo" : r.e_mode === "admin" ? "admin" : "active",
    batchName: r.e_mode
      ? (r.e_all || `${r.e_cls || p.cls}|${r.e_field || p.field}`)
          .split(",")
          .map((k) => nameOfBatch(k.split("|")[0] || p.cls, k.split("|")[1] || p.field))
          .join(" + ")
      : undefined,
    progress: r.e_mode ? (r.progress_pct ?? undefined) : undefined,
    behind: r.e_mode ? (r.behind_steps ?? undefined) : undefined,
    lastActive: iso(r.last_active),
    batchJoined: iso(r.e_paid),
    batchAmount: r.e_amount ?? undefined,
    paidTests: Number(r.paid_tests),
    paidTestAmount: Number(r.paid_amount || 0),
  };
}

/** One page of students matching the filters, plus whether there is a next page. */
export async function studentPage(f: Filters, perPage = PAGE) {
  const page = Math.max(1, Number(f.page) || 1);
  const { sql, params } = where(f);
  const rows = await q<Row>(
    `select u.id, u.mobile, u.email, u.created_at, u.profile, u.progress_pct, u.behind_steps, u.last_active,
       e.mode e_mode, e.amount e_amount, e.paid_at e_paid, e.cls e_cls, e.field e_field, la.result latest,
       (select string_agg(coalesce(e2.cls, u.cls) || '|' || coalesce(e2.field, u.field), ',' order by e2.paid_at) from enrollments e2
          where e2.user_id = u.id and e2.expires_at is null) e_all,
       (select count(*) from attempts a where a.user_id = u.id) attempts,
       (select max(percentage) from attempts a where a.user_id = u.id and a.status = 'submitted') best,
       lb.status call_status, lb.slot_start call_at,
       (select count(*) from test_purchases t where t.user_id = u.id) paid_tests,
       (select sum(amount) from test_purchases t where t.user_id = u.id) paid_amount
     ${FROM} where ${sql} order by ${ORDER[f.sort || "new"] || ORDER.new} limit ${perPage + 1} offset ${(page - 1) * perPage}`,
    params,
  );
  return { rows: rows.slice(0, perPage).map(toRow), page, hasNext: rows.length > perPage };
}

/** Total for the filters. Kept separate so the list itself never waits for it. */
export async function studentCount(f: Filters) {
  const { sql, params } = where(f);
  return Number((await q1<{ n: string }>(`select count(*) n ${FROM} where ${sql}`, params))?.n || 0);
}

/** For the CSV: walks through all matching students in pages (never all in memory at once). */
export async function* studentRowsAll(f: Filters) {
  for (let page = 1; ; page++) {
    const r = await studentPage({ ...f, page: String(page) }, 1000);
    yield r.rows;
    if (!r.hasNext) break;
  }
}

/** Overview numbers: one query. */
export async function funnel() {
  const r = (await q1<Record<string, string>>(
    `select
       (select count(*) from users) signups,
       (select count(*) from users where profile is not null) profiles,
       (select count(distinct user_id) from attempts) started,
       (select count(distinct user_id) from attempts where status = 'submitted') submitted,
       (select count(distinct user_id) from bookings where status <> 'cancelled') booked,
       (select count(distinct user_id) from bookings where status = 'attended') attended,
       (select count(distinct user_id) from enrollments where expires_at is null) paid,
       (select count(distinct user_id) from test_purchases) bought`,
  ))!;
  const n = (k: string) => Number(r[k] || 0);
  return [
    { label: "Signed up", value: n("signups") },
    { label: "Profile + consent", value: n("profiles") },
    { label: "Started test", value: n("started") },
    { label: "Submitted test", value: n("submitted") },
    { label: "Booked call", value: n("booked") },
    { label: "Attended call", value: n("attended") },
    { label: "Joined a batch", value: n("paid") },
    { label: "Bought a ₹49 test", value: n("bought") },
  ];
}

export const BANDS = [
  { v: "0-39", l: "0 to 39% (Beginner)" },
  { v: "40-59", l: "40 to 59% (Developing)" },
  { v: "60-79", l: "60 to 79% (Strong)" },
  { v: "80-100", l: "80 to 100% (Advanced)" },
  { v: "none", l: "No result yet" },
];

/* ------------------------------------------------------------------ batches */

export async function batchGroups(cls?: string) {
  const rows = await q<{ cls: string; field: string; n: string; avg: string | null; behind: string; idle: string }>(
    `select coalesce(e.cls, u.cls) cls, coalesce(e.field, u.field) field, count(*) n, round(avg(coalesce(u.progress_pct, 0))) avg,
       count(*) filter (where u.behind_steps > 0) behind,
       count(*) filter (where u.last_active is null or u.last_active < now() - interval '7 days') idle
     from users u join enrollments e on e.user_id = u.id and e.expires_at is null
     where ($1::text is null or coalesce(e.cls, u.cls) = $1)
     group by 1, 2`,
    [cls || null],
  );
  return rows.map((r) => ({ cls: r.cls, field: r.field, n: Number(r.n), avg: Number(r.avg || 0), behind: Number(r.behind), idle: Number(r.idle) }));
}

export async function batchStudentsTop(cls: string, field: string, sort: string, limit: number) {
  const order = sort === "name" ? "u.name_lc" : sort === "progress" ? "u.progress_pct asc nulls first" : "u.behind_steps desc nulls last";
  const rows = await q<{ id: string; mobile: string; name: string; progress_pct: number | null; behind_steps: number | null; last_active: Date | null; covered: string | null; open_doubts: string }>(
    `select u.id, u.mobile, u.profile->>'name' name, u.progress_pct, u.behind_steps, u.last_active,
       (select count(*) from doubts d where d.user_id = u.id and d.status = 'open') open_doubts
     from users u join enrollments e on e.user_id = u.id and e.expires_at is null
     where coalesce(e.cls, u.cls) = $1 and coalesce(e.field, u.field) = $2 order by ${order} limit $3`,
    [cls, field, limit],
  );
  return rows.map((r) => ({
    id: r.id,
    mobile: r.mobile,
    name: r.name,
    pct: r.progress_pct ?? 0,
    behind: r.behind_steps ?? 0,
    lastActive: iso(r.last_active),
    openDoubts: Number(r.open_doubts),
  }));
}

export async function batchSize(cls: string, field: string) {
  return Number((await q1<{ n: string }>(`select count(*) n from users u join enrollments e on e.user_id = u.id and e.expires_at is null where coalesce(e.cls, u.cls) = $1 and coalesce(e.field, u.field) = $2`, [cls, field]))?.n || 0);
}

export async function batchUserIds(cls: string, field: string) {
  return (await q<{ id: string }>(`select u.id from users u join enrollments e on e.user_id = u.id and e.expires_at is null where coalesce(e.cls, u.cls) = $1 and coalesce(e.field, u.field) = $2`, [cls, field])).map((r) => r.id);
}

/* ------------------------------------------------------------------ doubts */

export type DoubtFilters = { show?: string; cls?: string; field?: string; subject?: string; q?: string; student?: string; page?: string };

export async function doubtPage(f: DoubtFilters, perPage = 30) {
  const w: string[] = ["true"];
  const p: unknown[] = [];
  const add = (sql: string, v: unknown) => {
    p.push(v);
    w.push(sql.replaceAll("?", `$${p.length}`));
  };
  if (f.student) add("d.user_id = ?", f.student);
  if (f.cls) add("u.cls = ?", f.cls);
  if (f.field) add("u.field = ?", f.field);
  if (f.subject) add("d.subject = ?", f.subject);
  if (f.q) add("(u.name_lc like ? or u.mobile like ? or lower(u.email) like ? or lower(d.data::text) like ?)", `%${f.q.toLowerCase()}%`);
  const base = w.join(" and ");
  const show = f.show || "open";
  const statusSql = show === "all" ? "" : ` and d.status = $${p.length + 1}`;
  const page = Math.max(1, Number(f.page) || 1);
  const [rows, counts, subjects] = await Promise.all([
    q<{ data: Doubt; name: string | null; mobile: string; profile: Profile | null }>(
      `select d.data, u.profile->>'name' name, u.mobile, u.profile from doubts d join users u on u.id = d.user_id
       where ${base}${statusSql} order by d.updated_at ${show === "open" ? "asc" : "desc"} limit ${perPage + 1} offset ${(page - 1) * perPage}`,
      show === "all" ? p : [...p, show],
    ),
    q<{ status: string; n: string }>(`select d.status, count(*) n from doubts d join users u on u.id = d.user_id where ${base} group by d.status`, p),
    q<{ subject: string }>(`select distinct subject from doubts`),
  ]);
  const by = Object.fromEntries(counts.map((c) => [c.status, Number(c.n)]));
  return {
    list: rows.slice(0, perPage).map((r) => ({ doubt: r.data, name: r.name || "Student", mobile: r.mobile, profile: r.profile || undefined })),
    hasNext: rows.length > perPage,
    page,
    counts: { open: by.open || 0, answered: by.answered || 0, resolved: by.resolved || 0, all: Object.values(by).reduce((a, b) => a + b, 0) },
    subjects: subjects.map((s) => s.subject),
  };
}

/* ------------------------------------------------------------------ search, calls, calendar */

export async function searchStudents(text: string, limit = 8) {
  const v = `%${text.toLowerCase()}%`;
  const rows = await q<{ id: string; mobile: string; name: string; cls: string; enrolled: boolean }>(
    `select u.id, u.mobile, u.profile->>'name' name, u.cls,
       exists (select 1 from enrollments e where e.user_id = u.id and e.expires_at is null) enrolled
     from users u where u.profile is not null and (u.name_lc like $1 or u.mobile like $1 or lower(u.email) like $1) order by u.created_at desc limit $2`,
    [v, limit],
  );
  return rows;
}

export async function studentBrief(id: string) {
  return q1<{ id: string; mobile: string; name: string | null; cls: string | null; enrolled: boolean }>(
    `select u.id, u.mobile, u.profile->>'name' name, u.cls, exists (select 1 from enrollments e where e.user_id = u.id and e.expires_at is null) enrolled from users u where u.id = $1`,
    [id],
  );
}

type CallRow = { data: Booking; mobile: string; profile: Profile | null; attempt: Attempt | null };

export async function callList(show: string, limit: number, offset: number) {
  const cond =
    show === "all" ? "true" : show === "past" ? "b.slot_start < now() - interval '1 hour'" : "b.status = 'booked' and b.slot_start >= now() - interval '1 hour'";
  const order = show === "past" || show === "all" ? "desc" : "asc";
  const rows = await q<CallRow>(
    `select b.data, u.mobile, u.profile, a.data attempt from bookings b join users u on u.id = b.user_id
     left join attempts a on a.id = b.data->>'attemptId'
     where ${cond} order by b.slot_start ${order} limit ${limit + 1} offset ${offset}`,
  );
  return { rows: rows.slice(0, limit), hasNext: rows.length > limit };
}

export async function bookingsBetween(fromIso: string, toIso: string) {
  return q<{ data: Booking; mobile: string; profile: Profile | null }>(
    `select b.data, u.mobile, u.profile from bookings b join users u on u.id = b.user_id where b.slot_start >= $1 and b.slot_start < $2 order by b.slot_start`,
    [fromIso, toIso],
  );
}

export async function upcomingCalls(limit: number) {
  return q<{ data: Booking; name: string | null }>(
    `select b.data, u.profile->>'name' name from bookings b join users u on u.id = b.user_id
     where b.status = 'booked' and b.slot_start > now() - interval '1 hour' order by b.slot_start limit $1`,
    [limit],
  );
}

/** Seat count and money per masterclass, plus the first few students of each. */
export async function seatSummary(listLimit: number) {
  const [stats, holders] = await Promise.all([
    q<{ masterclass_id: string; n: string; revenue: string }>(`select masterclass_id, count(*) n, coalesce(sum(amount), 0) revenue from masterclass_seats group by masterclass_id`),
    q<{ masterclass_id: string; id: string; mobile: string; name: string | null; paid_at: Date; mode: string; amount: number }>(
      `select * from (
         select s.masterclass_id, u.id, u.mobile, u.profile->>'name' name, s.paid_at, s.mode, s.amount,
           row_number() over (partition by s.masterclass_id order by s.paid_at) rn
         from masterclass_seats s join users u on u.id = s.user_id) x
       where rn <= $1`,
      [listLimit],
    ),
  ]);
  const byMc = new Map<string, { n: number; revenue: number; list: { id: string; mobile: string; name: string; paidAt: string; mode: string; amount: number }[] }>();
  for (const s of stats) byMc.set(s.masterclass_id, { n: Number(s.n), revenue: Number(s.revenue), list: [] });
  for (const h of holders) byMc.get(h.masterclass_id)?.list.push({ id: h.id, mobile: h.mobile, name: h.name || "Student", paidAt: iso(h.paid_at)!, mode: h.mode, amount: h.amount });
  return byMc;
}

export type { Masterclass };
