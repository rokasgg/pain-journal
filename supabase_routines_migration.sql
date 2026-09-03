-- Run this once in the Supabase SQL editor (dashboard) to create the
-- `routines` and `exercise_logs` tables. This repo has no local `supabase/`
-- CLI folder — schema changes are applied by hand in the dashboard and then
-- mirrored in src/types/database.types.ts (already done for these tables).
--
-- Note: the FK below points at `physio_assessments`, not `physio_visits` —
-- that's the actual table name for physio visits in this schema (the
-- `physio-visit/` route folder is just an app-level naming choice). The
-- column itself is still named `physio_visit_id` to match the app's
-- terminology.

create table if not exists routines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  physio_visit_id uuid references physio_assessments(id) on delete set null,
  title text not null,
  is_active boolean not null default true,
  -- Array of { id, name, muscle_group, target_sets_reps, instructions, caution_notes }.
  -- Shape enforced app-side (src/types/database.types.ts), same as every
  -- other structured jsonb column in this schema (e.g. checkins.symptoms).
  exercises jsonb not null default '[]',
  created_at timestamptz not null default now()
);

create index if not exists idx_routines_user_id on routines(user_id);

create table if not exists exercise_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  routine_id uuid not null references routines(id) on delete cascade,
  logged_at timestamptz not null default now(),
  status text not null check (status in ('FULL', 'PARTIAL', 'SKIPPED')),
  -- Array of { exercise_id, completed, pain_discomfort_level (0-10),
  -- flagged_pain, note }. Same app-side-only shape/range enforcement as
  -- `routines.exercises` above.
  completed_exercises jsonb not null default '[]',
  general_note text
);

create index if not exists idx_exercise_logs_user_id on exercise_logs(user_id);
create index if not exists idx_exercise_logs_routine_id on exercise_logs(routine_id);

-- Only one active routine per user at a time: inserting/updating a routine
-- to is_active = true auto-deactivates that user's other routines, rather
-- than rejecting the write outright (a plain unique constraint would do
-- the latter, which isn't what was asked for).
create or replace function deactivate_other_routines()
returns trigger as $$
begin
  update routines
  set is_active = false
  where user_id = new.user_id
    and id != new.id
    and is_active = true;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_deactivate_other_routines on routines;
create trigger trg_deactivate_other_routines
  after insert or update of is_active on routines
  for each row
  when (new.is_active = true)
  execute function deactivate_other_routines();

-- RLS — same auth.uid() = user_id pattern as every other table in this schema.
alter table routines enable row level security;

create policy "Users can view their own routines"
  on routines for select
  using (auth.uid() = user_id);

create policy "Users can insert their own routines"
  on routines for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own routines"
  on routines for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own routines"
  on routines for delete
  using (auth.uid() = user_id);

alter table exercise_logs enable row level security;

create policy "Users can view their own exercise logs"
  on exercise_logs for select
  using (auth.uid() = user_id);

create policy "Users can insert their own exercise logs"
  on exercise_logs for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own exercise logs"
  on exercise_logs for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own exercise logs"
  on exercise_logs for delete
  using (auth.uid() = user_id);
