-- Personal experiments (Insights → Experiments): the user tries one change
-- for 7 or 14 days ("no screens after 22:00"), says each evening whether they
-- stuck to it, and the app compares those days with the 14 days before.
--   * experiments: one row per experiment. At most one 'active' per user.
--     'active' rows whose last day has passed are finished; the app marks
--     them 'done' when the next one starts.
--   * experiment_days: one row per day the user answered "did you stick to
--     it?" (asked in the evening check-in).
--
-- Run once in the Supabase SQL editor. Idempotent. Both tables are also in
-- the delete-account edge function's USER_TABLES.

create table if not exists experiments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  -- A template id from src/constants/experiments.ts, or 'custom'.
  template text not null,
  custom_title text,
  started_on date not null,
  length_days smallint not null check (length_days between 3 and 28),
  status text not null default 'active' check (status in ('active', 'done', 'stopped')),
  -- Set when stopped early.
  ended_on date,
  created_at timestamptz not null default now()
);

create index if not exists idx_experiments_user_id on experiments(user_id);
create unique index if not exists idx_experiments_one_active
  on experiments(user_id) where status = 'active';

create table if not exists experiment_days (
  id uuid primary key default gen_random_uuid(),
  experiment_id uuid not null references experiments(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  followed boolean not null,
  created_at timestamptz not null default now(),
  unique (experiment_id, date)
);

create index if not exists idx_experiment_days_user_id on experiment_days(user_id);

alter table experiments enable row level security;
alter table experiment_days enable row level security;

drop policy if exists "Users manage their own experiments" on experiments;
create policy "Users manage their own experiments"
  on experiments for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users manage their own experiment days" on experiment_days;
create policy "Users manage their own experiment days"
  on experiment_days for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
