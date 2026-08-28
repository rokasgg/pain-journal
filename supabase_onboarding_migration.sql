-- Run this once in the Supabase SQL editor (dashboard) to add the columns
-- the onboarding wizard (src/app/onboarding.tsx) reads/writes on `profiles`.
-- This repo has no local `supabase/` CLI folder — schema changes are applied
-- by hand in the dashboard and then mirrored in src/types/database.types.ts
-- (already done for these columns).

alter table profiles
  add column if not exists onboarding_completed boolean not null default false,
  add column if not exists injury_onset_date date,
  add column if not exists injury_onset_period text
    check (injury_onset_period in ('this_week', 'month_ago', 'months_ago', 'year_plus', 'unknown')),
  add column if not exists pain_locations text[] not null default '{}',
  add column if not exists pain_character text[] not null default '{}',
  add column if not exists pain_radiates text
    check (pain_radiates in ('yes', 'no', 'sometimes')),
  add column if not exists worst_time_of_day text
    check (worst_time_of_day in ('morning', 'evening', 'after_activity', 'no_pattern')),
  add column if not exists primary_goal text
    check (primary_goal in (
      'track_progress', 'identify_triggers', 'prepare_for_appointments', 'track_exercises', 'just_journal'
    )),
  add column if not exists checkin_depth_preference text
    check (checkin_depth_preference in ('quick', 'detailed', 'varies')),
  add column if not exists ai_insights_enabled boolean not null default true;

-- Existing users (who signed up before this migration) will have
-- onboarding_completed = false and get routed through the wizard once on
-- their next launch, same as a brand-new signup.
