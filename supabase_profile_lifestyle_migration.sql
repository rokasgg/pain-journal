-- Run once in the Supabase SQL editor. Idempotent (safe to re-run).
-- New onboarding: purpose, professional diagnosis, day-to-day ("About me"),
-- hunches, and the evening check-in's daily stress question.

-- 1. Profile: purpose (primary_goal gets two new values + 'both').
alter table profiles drop constraint if exists profiles_primary_goal_check;
alter table profiles add constraint profiles_primary_goal_check check (primary_goal in (
  'track_recovery', 'understand_pain', 'both',
  -- older answers, still read (identify_triggers = understand, track_progress = recovery)
  'track_progress', 'identify_triggers', 'prepare_for_appointments', 'track_exercises', 'just_journal'
));

-- 2. Profile: start date is approximate when picked as a rough period.
alter table profiles
  add column if not exists injury_started_approx boolean not null default false;

-- 3. Profile: the professional's diagnosis, recorded as the user was told it.
alter table profiles
  add column if not exists diagnosis_status text
    check (diagnosis_status in ('yes', 'not_yet', 'unsure')),
  add column if not exists diagnosis_text text,
  add column if not exists diagnosed_by text
    check (diagnosed_by in ('family_doctor', 'specialist', 'physio', 'chiropractor', 'other')),
  add column if not exists diagnosed_on date,
  add column if not exists diagnosis_notes text;

-- 4. Profile: day-to-day ("About me") and hunches.
alter table profiles
  add column if not exists work_type text
    check (work_type in ('sitting', 'standing', 'physical', 'mixed', 'not_working')),
  add column if not exists work_hours text
    check (work_hours in ('under_4', '4_6', '6_8', '8_plus')),
  add column if not exists life_stress text
    check (life_stress in ('low', 'moderate', 'high')),
  add column if not exists exercise_frequency text
    check (exercise_frequency in ('rarely', 'weekly_1_2', 'weekly_3_plus')),
  add column if not exists suspected_triggers text[] not null default '{}';

-- 5. Check-ins: today's stress (evening), 1 calm · 2 normal · 3 stressful · 4 very stressful.
alter table checkins
  add column if not exists stress_level smallint
    check (stress_level between 1 and 4);

-- 6. Retire injury_onset_date / injury_onset_period: copy them into
-- injury_started_on (the one date Settings, Home and the AI use) where it's
-- empty. A rough period becomes an approximate date. The old columns stay,
-- unused by the app.
update profiles
set injury_started_on = injury_onset_date,
    injury_started_approx = false
where injury_started_on is null and injury_onset_date is not null;

update profiles
set injury_started_on = (created_at::date - case injury_onset_period
      when 'this_week' then 3
      when 'month_ago' then 30
      when 'months_ago' then 90
      when 'year_plus' then 365
    end),
    injury_started_approx = true
where injury_started_on is null
  and injury_onset_period in ('this_week', 'month_ago', 'months_ago', 'year_plus');
