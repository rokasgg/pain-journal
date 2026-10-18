-- New-user journey:
--   * care_status — answer to the day-7 "Do you know what's causing your
--     pain?" step: working with a professional / not yet / just tracking.
--     The app never suggests a diagnosis; "not yet" points the user to a
--     physio or doctor (and is re-asked after 14 days).
--   * care_status_answered_at — when that was answered (drives the re-ask).
--   * training_enabled — whether training & physio features show. null means
--     "not decided yet": the app derives it (on for users who already have
--     routines or chose "track exercises" in onboarding).
--
-- Run once in the Supabase SQL editor.

alter table profiles
  add column if not exists care_status text
    check (care_status in ('with_professional', 'not_yet', 'just_tracking')),
  add column if not exists care_status_answered_at timestamptz,
  add column if not exists training_enabled boolean;
