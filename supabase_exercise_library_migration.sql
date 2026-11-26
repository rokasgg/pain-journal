-- Exercise library ("My exercises"), with routines kept as optional presets.
-- Run once in the Supabase SQL editor, like the other supabase_*_migration.sql
-- files. Idempotent: safe to re-run.
--
-- Before: a training log belonged to one routine, and could only tick that
-- routine's exercises (ids local to the routine's jsonb).
-- After:
--   exercises            one row per exercise the user does (the library)
--   routines.exercise_ids a preset: which library exercises it pre-ticks
--   exercise_logs        routine_id optional (the preset used, if any);
--                        completed_exercises[].exercise_id = exercises.id,
--                        plus a `name` snapshot so history survives renames
--                        and deletes. Deleting a preset keeps its logs.

-- 1. The library -------------------------------------------------------------

create table if not exists public.exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  muscle_group text,
  target_sets_reps text,
  instructions text,
  caution_notes text,
  archived boolean not null default false,
  created_at timestamptz not null default now()
);

create unique index if not exists idx_exercises_user_name
  on public.exercises (user_id, lower(trim(name)));

alter table public.exercises enable row level security;

drop policy if exists "Users manage their own exercises" on public.exercises;
create policy "Users manage their own exercises"
  on public.exercises for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 2. Backfill the library from every routine's exercises ---------------------
-- Deduped by name; the oldest routine's details win.

insert into public.exercises (user_id, name, muscle_group, target_sets_reps, instructions, caution_notes, created_at)
select distinct on (r.user_id, lower(trim(e.val->>'name')))
  r.user_id,
  regexp_replace(trim(e.val->>'name'), '\s+', ' ', 'g'),
  nullif(trim(e.val->>'muscle_group'), ''),
  nullif(trim(e.val->>'target_sets_reps'), ''),
  nullif(trim(e.val->>'instructions'), ''),
  nullif(trim(e.val->>'caution_notes'), ''),
  r.created_at
from public.routines r
cross join lateral jsonb_array_elements(r.exercises) as e(val)
where coalesce(trim(e.val->>'name'), '') <> ''
order by r.user_id, lower(trim(e.val->>'name')), r.created_at
on conflict (user_id, (lower(trim(name)))) do nothing;

-- 3. Routines become presets ---------------------------------------------------

alter table public.routines
  add column if not exists exercise_ids uuid[] not null default '{}';

update public.routines r
set exercise_ids = sub.ids
from (
  select r2.id, array_agg(x.id order by e.ord) as ids
  from public.routines r2
  cross join lateral jsonb_array_elements(r2.exercises) with ordinality as e(val, ord)
  join public.exercises x
    on x.user_id = r2.user_id
   and lower(trim(x.name)) = lower(regexp_replace(trim(e.val->>'name'), '\s+', ' ', 'g'))
  group by r2.id
) sub
where r.id = sub.id
  and r.exercise_ids = '{}';

-- 4. Logs no longer need a routine, and outlive a deleted preset -------------

alter table public.exercise_logs alter column routine_id drop not null;

do $$
declare
  fk record;
begin
  for fk in
    select c.conname
    from pg_constraint c
    join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any (c.conkey)
    where c.conrelid = 'public.exercise_logs'::regclass
      and c.contype = 'f'
      and a.attname = 'routine_id'
  loop
    execute format('alter table public.exercise_logs drop constraint %I', fk.conname);
  end loop;
end $$;

alter table public.exercise_logs
  add constraint exercise_logs_routine_id_fkey
  foreign key (routine_id) references public.routines(id) on delete set null;

-- 5. Old log entries: routine-local id -> library id, plus a name snapshot ---
-- Only rewrites entries that don't have a `name` key yet. An entry whose
-- exercise can't be resolved keeps its old id and gets "name": null.

update public.exercise_logs l
set completed_exercises = coalesce((
  select jsonb_agg(
    c.val || jsonb_build_object(
      'name', re.val->>'name',
      'exercise_id', coalesce(x.id::text, c.val->>'exercise_id')
    )
    order by c.ord
  )
  from jsonb_array_elements(l.completed_exercises) with ordinality as c(val, ord)
  left join public.routines r on r.id = l.routine_id
  left join lateral (
    select e.val
    from jsonb_array_elements(r.exercises) as e(val)
    where e.val->>'id' = c.val->>'exercise_id'
    limit 1
  ) re on true
  left join public.exercises x
    on x.user_id = l.user_id
   and lower(trim(x.name)) = lower(regexp_replace(trim(re.val->>'name'), '\s+', ' ', 'g'))
), '[]'::jsonb)
where exists (
  select 1 from jsonb_array_elements(l.completed_exercises) as c(val)
  where not (c.val ? 'name')
);
