-- Replaces the single-active-routine model with a multi-routine "in
-- rotation" model, so a user can alternate between routines prescribed for
-- different days (e.g. Routine #1 one day, Routine #2 the next) instead of
-- generating a new one always retiring the previous one.
--
-- Run once in the Supabase SQL editor, after supabase_routines_migration.sql.

alter table routines rename column is_active to in_rotation;

drop trigger if exists trg_deactivate_other_routines on routines;
drop function if exists deactivate_other_routines();
