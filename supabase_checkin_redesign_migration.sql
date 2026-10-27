-- Evening check-in redesign ("Kita fizinė veikla": Walking / Swimming / Gym /
-- Cycling / custom). Run once in the Supabase SQL editor, like the other
-- supabase_*_migration.sql files — BEFORE using the new evening check-in
-- (inserts include this column).
--
-- Holds stable English identifiers (or custom text the user typed), like
-- checkins.triggers. `did_exercises` stays: true when any activity is picked,
-- false for "Nebuvo" (none), null when unanswered.

alter table public.checkins
  add column if not exists exercise_types text[] not null default '{}';
