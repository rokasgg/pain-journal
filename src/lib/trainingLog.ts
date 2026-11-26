import type { CompletedExercise, Exercise, ExerciseLogStatus } from '@/types/database.types';

// Logging a workout = ticking exercises from the library ("My exercises").
// A preset (routine) only pre-ticks a set; the user can tick anything else
// or type a new exercise on the spot. Shared by training/log.tsx and the
// evening check-in's training step, so both save the same shape.

// Discomfort at or above this flags the exercise for follow-up.
export const FLAGGED_PAIN_THRESHOLD = 5;

export interface TrainingEntryDetail {
  painDiscomfortLevel: number;
  note: string;
}

export interface TrainingDraft {
  /** Ticked library exercise ids, in the order they were ticked. */
  ticked: string[];
  /** Optional per-exercise discomfort + note, keyed by exercise id. */
  details: Record<string, TrainingEntryDetail>;
}

export const EMPTY_TRAINING_DRAFT: TrainingDraft = { ticked: [], details: {} };

/** Trims and collapses inner whitespace — the form names are stored in. */
export function cleanExerciseName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

/** The key two names are "the same exercise" by (matches the DB unique index). */
export function normalizeExerciseName(name: string): string {
  return cleanExerciseName(name).toLowerCase();
}

export function findExerciseByName<T extends Pick<Exercise, 'name'>>(exercises: T[], name: string): T | undefined {
  const key = normalizeExerciseName(name);
  return exercises.find((exercise) => normalizeExerciseName(exercise.name) === key);
}

export function toggleTicked(draft: TrainingDraft, id: string): TrainingDraft {
  const ticked = draft.ticked.includes(id) ? draft.ticked.filter((x) => x !== id) : [...draft.ticked, id];
  return { ...draft, ticked };
}

export function tick(draft: TrainingDraft, id: string): TrainingDraft {
  return draft.ticked.includes(id) ? draft : { ...draft, ticked: [...draft.ticked, id] };
}

/** True when every one of the preset's (available) exercises is ticked. */
export function isPresetApplied(draft: TrainingDraft, presetIds: string[]): boolean {
  return presetIds.length > 0 && presetIds.every((id) => draft.ticked.includes(id));
}

/**
 * Tapping a preset chip: ticks its exercises, or, when they're all ticked
 * already, unticks them again. Other ticks are left alone.
 */
export function applyPreset(draft: TrainingDraft, presetIds: string[]): TrainingDraft {
  if (isPresetApplied(draft, presetIds)) {
    return { ...draft, ticked: draft.ticked.filter((id) => !presetIds.includes(id)) };
  }
  const ticked = [...draft.ticked];
  for (const id of presetIds) if (!ticked.includes(id)) ticked.push(id);
  return { ...draft, ticked };
}

export function setDetail(draft: TrainingDraft, id: string, patch: Partial<TrainingEntryDetail>): TrainingDraft {
  const current = draft.details[id] ?? { painDiscomfortLevel: 0, note: '' };
  return { ...draft, details: { ...draft.details, [id]: { ...current, ...patch } } };
}

/** The preset whose exercises match the ticks best, for `routine_id`. */
export function matchingPresetId(draft: TrainingDraft, presets: { id: string; exercise_ids: string[] }[]): string | null {
  let best: { id: string; overlap: number } | null = null;
  for (const preset of presets) {
    const overlap = preset.exercise_ids.filter((id) => draft.ticked.includes(id)).length;
    if (overlap > 0 && (!best || overlap > best.overlap)) best = { id: preset.id, overlap };
  }
  return best?.id ?? null;
}

export interface BuiltTrainingLog {
  routine_id: string | null;
  status: ExerciseLogStatus;
  completed_exercises: CompletedExercise[];
}

/**
 * The exercise_logs row for a draft. Only ticked exercises are stored, each
 * with a name snapshot. Status: FULL/PARTIAL against the preset that matches
 * best, FULL without one. Returns null when nothing is ticked (nothing to save).
 */
export function buildTrainingLog(
  draft: TrainingDraft,
  exercises: Pick<Exercise, 'id' | 'name'>[],
  presets: { id: string; exercise_ids: string[] }[],
): BuiltTrainingLog | null {
  const byId = new Map(exercises.map((exercise) => [exercise.id, exercise]));
  const completed: CompletedExercise[] = [];
  for (const id of draft.ticked) {
    const exercise = byId.get(id);
    if (!exercise) continue;
    const detail = draft.details[id] ?? { painDiscomfortLevel: 0, note: '' };
    completed.push({
      exercise_id: id,
      name: exercise.name,
      completed: true,
      pain_discomfort_level: detail.painDiscomfortLevel,
      flagged_pain: detail.painDiscomfortLevel >= FLAGGED_PAIN_THRESHOLD,
      note: detail.note.trim() || null,
    });
  }
  if (completed.length === 0) return null;

  const routineId = matchingPresetId(draft, presets);
  const preset = presets.find((p) => p.id === routineId);
  const status: ExerciseLogStatus =
    preset && !preset.exercise_ids.every((id) => draft.ticked.includes(id) || !byId.has(id)) ? 'PARTIAL' : 'FULL';

  return { routine_id: routineId, status, completed_exercises: completed };
}
