// Copies the old local file database (.data/db.json) into Postgres, once.
// Called by db-setup.ts. Rows that already exist are skipped.
import { existsSync, readFileSync } from "fs";
import type { Client } from "pg";
import type { DB } from "../src/lib/types";

export async function importOld(db: Client) {
  if (!existsSync(".data/db.json")) return;
  const done = await db.query(`select 1 from settings where key = 'importedFileDb'`);
  if (done.rowCount) return;
  const old = JSON.parse(readFileSync(".data/db.json", "utf8")) as Partial<DB>;
  const j = (v: unknown) => JSON.stringify(v ?? null);
  const n: Record<string, number> = {};
  const run = async (table: string, sql: string, params: unknown[]) => {
    const r = await db.query(sql, params);
    n[table] = (n[table] || 0) + (r.rowCount || 0);
  };

  await db.query("begin");
  try {
    for (const u of old.users || []) {
      await run("users", `insert into users (id, mobile, created_at, session_id, profile, learn_done, learn_plan, notif_read) values ($1,$2,$3,$4,$5,$6,$7,$8) on conflict do nothing`, [
        u.id, u.mobile, u.createdAt, u.activeSessionId || null, u.profile ? j(u.profile) : null, j(u.learn?.done || {}), u.learn?.plan ? j(u.learn.plan) : null, j(u.notifRead || []),
      ]);
      for (const e of u.enrollments || [])
        await run("enrollments", `insert into enrollments (id, user_id, amount, paid_at, expires_at, mode, payment_id, cls, field) values ($1,$2,$3,$4,$5,$6,$7,$8,$9) on conflict do nothing`, [
          e.id, u.id, e.amount, e.paidAt, e.expiresAt || null, e.mode, e.paymentId || null, e.cls || u.profile?.cls || null, e.field || u.profile?.field || null,
        ]);
      for (const t of u.testPurchases || [])
        await run("test_purchases", `insert into test_purchases (id, user_id, amount, paid_at, mode) values ($1,$2,$3,$4,$5) on conflict do nothing`, [t.id, u.id, t.amount, t.paidAt, t.mode]);
    }
    for (const m of old.masterclasses || []) await run("masterclasses", `insert into masterclasses (id, starts_at, data) values ($1,$2,$3) on conflict do nothing`, [m.id, m.startsAt, j(m)]);
    for (const u of old.users || [])
      for (const s of u.masterclassSeats || [])
        await run("masterclass_seats", `insert into masterclass_seats (masterclass_id, user_id, amount, paid_at, mode) select $1,$2,$3,$4,$5 where exists (select 1 from masterclasses where id = $1) on conflict do nothing`, [
          s.masterclassId, u.id, s.amount, s.paidAt, s.mode,
        ]);
    for (const a of old.attempts || [])
      await run("attempts", `insert into attempts (id, user_id, status, attempt_no, checkpoint_no, started_at, expires_at, submitted_at, percentage, data) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) on conflict do nothing`, [
        a.id, a.userId, a.status, a.attemptNo, a.checkpointNo ?? null, a.startedAt, a.expiresAt, a.submittedAt || null, a.result?.percentage ?? null, j(a),
      ]);
    for (const b of old.bookings || []) await run("bookings", `insert into bookings (id, user_id, slot_start, status, data) values ($1,$2,$3,$4,$5) on conflict do nothing`, [b.id, b.userId, b.slotStart, b.status, j(b)]);
    for (const q of old.questions || []) await run("questions", `insert into questions (id, active, data) values ($1,$2,$3) on conflict do nothing`, [q.id, q.active, j(q)]);
    for (const m of old.messages || []) await run("messages", `insert into messages (id, at, data) values ($1,$2,$3) on conflict do nothing`, [m.id, m.at, j(m)]);
    for (const d of old.doubts || [])
      await run("doubts", `insert into doubts (id, user_id, status, subject, updated_at, data) values ($1,$2,$3,$4,$5,$6) on conflict do nothing`, [d.id, d.userId, d.status, d.subject, d.updatedAt, j(d)]);
    for (const x of old.notifications || []) {
      const a = x.audience;
      await run("notifications", `insert into notifications (id, created_at, aud_type, aud_cls, aud_field, aud_user, data) values ($1,$2,$3,$4,$5,$6,$7) on conflict do nothing`, [
        x.id, x.createdAt, a.type, a.type === "class" || a.type === "batch" ? a.cls || null : null, a.type === "batch" ? a.field || null : null, a.type === "student" ? a.userId : null, j(x),
      ]);
    }
    for (const t of old.tasks || [])
      await run("tasks", `insert into tasks (id, target_user, target_cls, target_field, date, data) values ($1,$2,$3,$4,$5,$6) on conflict do nothing`, [
        t.id, t.target.type === "student" ? t.target.userId : null, t.target.type === "batch" ? t.target.cls : null, t.target.type === "batch" ? t.target.field : null, t.date, j(t),
      ]);
    for (const [key, plan] of Object.entries(old.batchPlans || {})) await run("batch_plans", `insert into batch_plans (key, data) values ($1,$2) on conflict do nothing`, [key, j(plan)]);
    if (old.settings?.google) await run("settings", `insert into settings (key, data) values ('google', $1) on conflict do nothing`, [j(old.settings.google)]);
    if (old.settings?.mcSeed) await run("settings", `insert into settings (key, data) values ('mcSeed', $1) on conflict do nothing`, [j(old.settings.mcSeed)]);
    await db.query(`insert into settings (key, data) values ('importedFileDb', $1) on conflict do nothing`, [j(new Date().toISOString())]);
    await db.query("commit");
  } catch (e) {
    await db.query("rollback");
    throw e;
  }
  console.log("Copied your old .data/db.json into the database:", n);
}
