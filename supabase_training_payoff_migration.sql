-- Training payoff + weekly goal:
--   * exercise_logs.pain_before / pain_after — optional 0-10 pain right before
--     and after a training session, so the app can show whether training
--     actually helps ("pain 5 → 3").
--   * profiles.weekly_training_goal — sessions per week (1-7) for the Home
--     weekly-goal card, which replaced the daily streak so rest days never
--     "break" anything.
--
-- Run once in the Supabase SQL editor, after supabase_routines_migration_v2.sql.

alter table exercise_logs
  add column if not exists pain_before smallint check (pain_before between 0 and 10),
  add column if not exists pain_after smallint check (pain_after between 0 and 10);

alter table profiles
  add column if not exists weekly_training_goal smallint not null default 3
    check (weekly_training_goal between 1 and 7);
