-- Late logging for check-ins (History calendar → "Įrašyti vėliau").
-- Run once in the Supabase SQL editor, like the other supabase_*_migration.sql files.
--
-- A missed morning/evening check-in can be added for yesterday or the day
-- before. It's saved with its real checkin_date/type, plus:
--   logged_late = true
--   logged_at   = when it was actually entered
-- The allowed window is enforced in the app (src/lib/lateLogging.ts).

alter table public.checkins
  add column if not exists logged_late boolean not null default false,
  add column if not exists logged_at timestamptz;
