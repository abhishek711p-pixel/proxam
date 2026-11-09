// Creates the tables, copies the old .data/db.json once (if it exists),
// then adds the starter questions and masterclasses if those are empty or out of date. Safe to run again.
// Run: npm run db:setup
import { readFileSync } from "fs";
import { Client } from "pg";
import { loadEnv, sslFor } from "./env";
import { importOld } from "./db-import";
import { Q_SEED_VERSION, RETIRED_SEED_PREFIXES, seedQuestions } from "../src/lib/questionBank";
import { MC_SEED_VERSION, OLD_STARTER_TITLES, seedMasterclasses } from "../src/lib/masterclassSeed";

async function main() {
  loadEnv();
  const url = process.env.DATABASE_URL!;
  // DDL needs a direct (non-pooled) connection on Neon; use DATABASE_URL_UNPOOLED if you have it.
  const db = new Client({ connectionString: process.env.DATABASE_URL_UNPOOLED || url, ssl: sslFor(url) });
  await db.connect();
  console.log("Creating tables...");
  await db.query(readFileSync("db/schema.sql", "utf8"));
  await importOld(db);

  const { rows: qn } = await db.query("select count(*)::int n from questions");
  const { rows: qs0 } = await db.query(`select data from settings where key = 'qSeed'`);
  const qVersion = Number(qs0[0]?.data || 0);
  if (qn[0].n === 0 || qVersion < Q_SEED_VERSION) {
    const qs = seedQuestions();
    // New starter questions are added; existing ones get the latest text but keep the admin's active/inactive choice.
    await db.query(
      `insert into questions (id, active, data) select x->>'id', (x->>'active')::boolean, x from jsonb_array_elements($1::jsonb) x
       on conflict (id) do update set data = excluded.data || jsonb_build_object('active', questions.active)`,
      [JSON.stringify(qs)],
    );
    // Old starter subjects the new test blueprint does not use: hide them (old results still need them, so no delete).
    const retired = await db.query(
      `update questions set active = false, data = data || '{"active": false}'::jsonb where active and id like any($1) returning 1`,
      [RETIRED_SEED_PREFIXES.map((p) => `${p}%`)],
    );
    await db.query(`insert into settings (key, data) values ('qSeed', $1) on conflict (key) do update set data = excluded.data`, [JSON.stringify(Q_SEED_VERSION)]);
    console.log(`Starter questions up to date (${qs.length}). Retired ${retired.rowCount} old Class 10 questions.`);
  } else console.log(`Question bank already has ${qn[0].n} questions.`);

  const { rows: st } = await db.query(`select data from settings where key = 'mcSeed'`);
  const version = Number(st[0]?.data || 0);
  const { rows: mcn } = await db.query("select count(*)::int n from masterclasses");
  if (version < MC_SEED_VERSION || mcn[0].n === 0) {
    await db.query(
      `delete from masterclasses m where m.data->>'title' = any($1) and not exists (select 1 from masterclass_seats s where s.masterclass_id = m.id)`,
      [OLD_STARTER_TITLES],
    );
    const list = seedMasterclasses();
    for (const m of list) await db.query(`insert into masterclasses (id, starts_at, data) values ($1,$2,$3) on conflict do nothing`, [m.id, m.startsAt, JSON.stringify(m)]);
    await db.query(`insert into settings (key, data) values ('mcSeed', $1) on conflict (key) do update set data = excluded.data`, [JSON.stringify(MC_SEED_VERSION)]);
    console.log(`Added ${list.length} starter masterclasses (change them in Admin > Masterclasses).`);
  }
  await db.end();
  console.log("Database is ready.");
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
