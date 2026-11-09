-- Proxam database (PostgreSQL / Neon).
-- Safe to run again: everything is "if not exists".
-- Run with: npm run db:setup

create extension if not exists pg_trgm;

-- Students. Profile and roadmap edits are JSON; the columns used for search and filters are generated from it.
create table if not exists users (
  id text primary key,
  mobile text,                                     -- contact number from onboarding (siblings may share one)
  email text,                                      -- login identity (OTP goes here)
  created_at timestamptz not null default now(),
  session_id text,
  profile jsonb,
  learn_done jsonb not null default '{}'::jsonb,   -- roadmap step id -> when it was ticked
  learn_plan jsonb,                                -- mentor's edits to this student's roadmap
  notif_read jsonb not null default '[]'::jsonb,   -- notification ids seen
  cls text generated always as (profile->>'cls') stored,
  field text generated always as (profile->>'field') stored,
  name_lc text generated always as (lower(profile->>'name')) stored,
  city_lc text generated always as (lower(profile->>'city')) stored,
  -- roadmap progress, saved whenever it changes so admin lists can sort and filter lakhs of students quickly
  progress_pct integer,
  behind_steps integer,
  last_active timestamptz,
  progress_at timestamptz
);
-- Email login (Nov 2026): older databases had a required, unique mobile as the login.
alter table users add column if not exists email text;
alter table users alter column mobile drop not null;
alter table users drop constraint if exists users_mobile_key;
create unique index if not exists users_email_unique on users (lower(email));
create index if not exists users_email_trgm on users using gin (lower(email) gin_trgm_ops);
create index if not exists users_created_idx on users (created_at desc);
create index if not exists users_cls_field_idx on users (cls, field);
create index if not exists users_name_trgm on users using gin (name_lc gin_trgm_ops);
create index if not exists users_mobile_trgm on users using gin (mobile gin_trgm_ops);
create index if not exists users_progress_stale_idx on users (progress_at nulls first);

create table if not exists enrollments (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  amount integer not null,
  paid_at timestamptz not null,
  expires_at timestamptz,
  mode text not null,
  payment_id text unique,
  cls text,
  field text
);
-- one active batch per student, even if they click "Join" twice at the same moment
create unique index if not exists enrollments_one_active on enrollments (user_id) where expires_at is null;
create index if not exists enrollments_batch_idx on enrollments (cls, field) where expires_at is null;

create table if not exists test_purchases (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  amount integer not null,
  paid_at timestamptz not null,
  mode text not null,
  payment_id text unique
);
create index if not exists test_purchases_user_idx on test_purchases (user_id);

create table if not exists masterclasses (
  id text primary key,
  starts_at timestamptz not null,
  data jsonb not null
);
create index if not exists masterclasses_start_idx on masterclasses (starts_at);

create table if not exists masterclass_seats (
  masterclass_id text not null references masterclasses(id) on delete cascade,
  user_id text not null references users(id) on delete cascade,
  amount integer not null,
  paid_at timestamptz not null,
  mode text not null,
  payment_id text unique,
  primary key (masterclass_id, user_id)
);
create index if not exists masterclass_seats_user_idx on masterclass_seats (user_id);

create table if not exists otps (
  key text primary key,
  hash text not null,
  expires_at bigint not null,
  tries integer not null default 0,
  sent_at bigint not null
);

-- Test attempts. The whole attempt is JSON; the columns below are copies for fast lookups.
create table if not exists attempts (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  status text not null,
  attempt_no integer not null default 0,
  checkpoint_no integer,
  started_at timestamptz not null,
  expires_at timestamptz not null,
  submitted_at timestamptz,
  percentage numeric,
  data jsonb not null
);
create index if not exists attempts_user_idx on attempts (user_id, started_at desc);
-- one open test per student (double clicks and two tabs cannot start two)
create unique index if not exists attempts_one_open on attempts (user_id) where status = 'in_progress';
-- attempt numbers cannot repeat (two tabs cannot both take "attempt 2")
create unique index if not exists attempts_no_unique on attempts (user_id, attempt_no) where checkpoint_no is null;
create unique index if not exists attempts_checkpoint_unique on attempts (user_id, checkpoint_no) where checkpoint_no is not null;
create index if not exists attempts_open_expiry_idx on attempts (expires_at) where status = 'in_progress';
create index if not exists attempts_submitted_idx on attempts (submitted_at desc) where status = 'submitted';

create table if not exists bookings (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  slot_start timestamptz not null,
  status text not null,
  data jsonb not null
);
create index if not exists bookings_user_idx on bookings (user_id);
create index if not exists bookings_slot_idx on bookings (slot_start) where status <> 'cancelled';

create table if not exists questions (
  id text primary key,
  active boolean not null default true,
  data jsonb not null
);

create table if not exists messages (
  id text primary key,
  at timestamptz not null,
  data jsonb not null
);
create index if not exists messages_at_idx on messages (at desc);

create table if not exists doubts (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  status text not null,
  subject text not null,
  updated_at timestamptz not null,
  data jsonb not null
);
create index if not exists doubts_status_idx on doubts (status, updated_at);
create index if not exists doubts_user_idx on doubts (user_id, updated_at desc);

create table if not exists notifications (
  id text primary key,
  created_at timestamptz not null,
  aud_type text not null,          -- all | class | batch | student
  aud_cls text,
  aud_field text,
  aud_user text,
  read_count integer not null default 0,
  data jsonb not null
);
create index if not exists notifications_created_idx on notifications (created_at desc);
create index if not exists notifications_user_idx on notifications (aud_user, created_at desc) where aud_type = 'student';

create table if not exists tasks (
  id text primary key,
  target_user text,
  target_cls text,
  target_field text,
  date text not null,
  data jsonb not null
);
create index if not exists tasks_user_idx on tasks (target_user) where target_user is not null;
create index if not exists tasks_batch_idx on tasks (target_cls, target_field) where target_user is null;

create table if not exists batch_plans (
  key text primary key,            -- "cls|field"
  data jsonb not null
);

create table if not exists settings (
  key text primary key,
  data jsonb not null
);

-- Simple fixed-window counters for rate limits (OTP per number, requests per IP).
create table if not exists rate_limits (
  key text primary key,
  window_start bigint not null,
  count integer not null
);

-- Study material per syllabus chapter (YouTube videos, notes PDFs, DPP). Same for every batch with that chapter.
create table if not exists chapter_content (
  chapter_id text primary key,
  updated_at timestamptz not null default now(),
  data jsonb not null
);

-- Class 12 Science split into four batches (Nov 2026): JEE, NEET, Boards PCM, Boards PCB.
-- Older Class 12 PCM / PCMB batches become JEE, PCB becomes NEET. Safe to run again (touches only old values).
update enrollments set field = case field when 'pcb' then 'neet' else 'jee' end
  where cls = '12' and field in ('pcm', 'pcb', 'pcmb');
insert into batch_plans (key, data)
  select case key when '12|pcb' then '12|neet' else '12|jee' end, data from batch_plans where key in ('12|pcm', '12|pcmb', '12|pcb')
  on conflict (key) do nothing;
delete from batch_plans where key in ('12|pcm', '12|pcmb', '12|pcb');
update tasks set target_field = case target_field when 'pcb' then 'neet' else 'jee' end,
    data = jsonb_set(data, '{target,field}', to_jsonb(case target_field when 'pcb' then 'neet' else 'jee' end))
  where target_user is null and target_cls = '12' and target_field in ('pcm', 'pcb', 'pcmb');
update notifications set aud_field = case aud_field when 'pcb' then 'neet' else 'jee' end,
    data = jsonb_set(data, '{audience,field}', to_jsonb(case aud_field when 'pcb' then 'neet' else 'jee' end))
  where aud_type = 'batch' and aud_cls = '12' and aud_field in ('pcm', 'pcb', 'pcmb');

-- Razorpay orders (Nov 2026). An order is made before Checkout opens; it becomes "paid" only after the
-- Razorpay signature is checked (in /api/pay/verify or the webhook), and only then the batch/test/seat is given.
-- status: created | paid | needs_refund (paid, but the student already had that batch: refund from Razorpay dashboard)
create table if not exists payment_orders (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  kind text not null,
  ref text,
  cls text,
  amount integer not null,
  status text not null default 'created',
  payment_id text unique,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);
create index if not exists payment_orders_user_idx on payment_orders (user_id, created_at desc);
create index if not exists payment_orders_status_idx on payment_orders (status, created_at desc);
