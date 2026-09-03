import type { CompletedExercise, ExerciseLogStatus, RoutineExercise } from '@/types/database.types';

// A pain/discomfort level at or above this is flagged for follow-up — same
// meaning as "aštrus diegimas" caution language shown in exercise
// caution_notes, just expressed as a threshold rather than free text.
const FLAGGED_PAIN_THRESHOLD = 5;

export interface ExerciseLogDraftEntry {
  completed: boolean;
  painDiscomfortLevel: number;
  note: string;
}

export type ExerciseLogDraft = Record<string, ExerciseLogDraftEntry>;

export function initExerciseLogDraft(exercises: RoutineExercise[]): ExerciseLogDraft {
  return Object.fromEntries(
    exercises.map((exercise) => [exercise.id, { completed: false, painDiscomfortLevel: 0, note: '' }]),
  );
}

// Shared by the full "Atlikti treniruotę" flow and the condensed evening
// check-in checklist, so both build the exact same completed_exercises/
// status shape.
export function buildCompletedExercises(exercises: RoutineExercise[], draft: ExerciseLogDraft): CompletedExercise[] {
  return exercises.map((exercise) => {
    const entry = draft[exercise.id] ?? { completed: false, painDiscomfortLevel: 0, note: '' };
    return {
      exercise_id: exercise.id,
      completed: entry.completed,
      // Discomfort/pain only means something for an exercise that was
      // actually done — zero it out rather than persisting a stale slider
      // value from before the checkbox was unchecked.
      pain_discomfort_level: entry.completed ? entry.painDiscomfortLevel : 0,
      flagged_pain: entry.completed && entry.painDiscomfortLevel >= FLAGGED_PAIN_THRESHOLD,
      note: entry.note.trim() || null,
    };
  });
}

export function computeExerciseLogStatus(completedExercises: CompletedExercise[]): ExerciseLogStatus {
  const completedCount = completedExercises.filter((exercise) => exercise.completed).length;
  if (completedCount === 0) return 'SKIPPED';
  if (completedCount === completedExercises.length) return 'FULL';
  return 'PARTIAL';
}
