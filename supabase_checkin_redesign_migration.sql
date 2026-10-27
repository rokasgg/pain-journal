-- Check-in redesign: evening "Kita fizinė veikla" (Walking / Swimming / Gym /
-- Cycling / custom) and morning "Miego padėtis" (several positions allowed). Run once in the Supabase SQL editor, like the other
-- supabase_*_migration.sql files — BEFORE using the new evening check-in
-- (inserts include this column).
--
-- Both columns hold stable English identifiers (or custom text the user typed), like
-- checkins.triggers.
--  - `did_exercises` stays: true when any activity is picked, false for
--    "Nebuvo" (none), null when unanswered.
--  - `sleep_position` stays too: the app writes the first picked position into
--    it, so older readers (AI prompts) keep working.

alter table public.checkins
  add column if not exists exercise_types text[] not null default '{}',
  add column if not exists sleep_positions text[] not null default '{}';
