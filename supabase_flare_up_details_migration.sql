-- Flare-up details (Paūmėjimas screen: "Kur skauda?", "Kiti simptomai",
-- "Kas galėjo išprovokuoti?"). Run once in the Supabase SQL editor, like the
-- other supabase_*_migration.sql files — BEFORE using the new flare-up form
-- (inserts include these columns) and before redeploying the edge functions
-- that select them (analyze-patterns, physio-summary, chat-about-data).
--
-- All three hold stable English identifiers (or custom text the user typed),
-- like checkins.triggers. `likely_cause` stays: the app still writes the
-- triggers joined with ", " into it, so older readers keep working.

alter table public.flare_ups
  add column if not exists pain_areas text[] not null default '{}',
  add column if not exists symptoms text[] not null default '{}',
  add column if not exists triggers text[] not null default '{}';
