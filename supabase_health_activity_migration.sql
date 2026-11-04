-- Apple Health activity on evening check-ins:
--   * steps — step count for that day, read from Apple Health when the
--     evening check-in is saved. null when Health isn't connected.
--   * health_workouts — that day's workouts from Apple Health (any app that
--     writes to Health: Strava, Apple Watch, Garmin…), as
--     [{ "type": "Walking", "minutes": 45, "source": "Strava" }].
--
-- Only new evening check-ins fill these; edits never overwrite them.
-- Idempotent. Run once in the Supabase SQL editor, before redeploying
-- analyze-patterns, physio-summary and chat-about-data (they select these).

alter table checkins
  add column if not exists steps integer check (steps is null or steps >= 0),
  add column if not exists health_workouts jsonb not null default '[]'::jsonb;
