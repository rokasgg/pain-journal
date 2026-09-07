import { useMemo } from 'react';

import { useExerciseLogHistory } from '@/hooks/useExerciseLogs';
import { useRoutineHistory } from '@/hooks/useRoutines';

const HISTORY_DAYS = 30;
const MIN_INSTANCES = 3;
const NEEDS_ATTENTION_AVG_PAIN = 5;
const NEEDS_ATTENTION_FLAGGED_RATE = 0.4;
const GOING_WELL_AVG_PAIN = 3;
const GOING_WELL_COMPLETION_RATE = 0.8;

export type MuscleFocusStatus = 'needsAttention' | 'goingWell';

export interface MuscleFocusGroup {
  muscleGroup: string;
  status: MuscleFocusStatus;
  instanceCount: number;
  completionRate: number;
  avgPain: number;
  flaggedRate: number;
}

// Deterministic, zero-AI-cost replacement for asking the user to self-report
// which muscles need work during physio-visit logging: derives the same
// answer from exercise_logs data the user already produces by completing
// their routine. Pure client-side arithmetic — no model call, so it scales
// to any number of users at no marginal cost.
export function useExerciseMuscleFocus() {
  const { logs, isLoading: isLoadingLogs } = useExerciseLogHistory(HISTORY_DAYS);
  const { routines, isLoading: isLoadingRoutines } = useRoutineHistory();

  const groups = useMemo(() => {
    const muscleGroupByExerciseId = new Map<string, string>();
    for (const routine of routines) {
      for (const exercise of routine.exercises) {
        if (!muscleGroupByExerciseId.has(exercise.id)) {
          muscleGroupByExerciseId.set(exercise.id, exercise.muscle_group);
        }
      }
    }

    interface Accumulator {
      instanceCount: number;
      completedCount: number;
      painSum: number;
      flaggedCount: number;
    }
    const byMuscleGroup = new Map<string, Accumulator>();

    for (const log of logs) {
      for (const entry of log.completed_exercises) {
        const muscleGroup = muscleGroupByExerciseId.get(entry.exercise_id);
        if (!muscleGroup) continue;

        const acc = byMuscleGroup.get(muscleGroup) ?? {
          instanceCount: 0,
          completedCount: 0,
          painSum: 0,
          flaggedCount: 0,
        };
        acc.instanceCount += 1;
        if (entry.completed) {
          acc.completedCount += 1;
          acc.painSum += entry.pain_discomfort_level;
          if (entry.flagged_pain) acc.flaggedCount += 1;
        }
        byMuscleGroup.set(muscleGroup, acc);
      }
    }

    const result: MuscleFocusGroup[] = [];
    for (const [muscleGroup, acc] of byMuscleGroup) {
      if (acc.instanceCount < MIN_INSTANCES) continue;

      const completionRate = acc.completedCount / acc.instanceCount;
      const avgPain = acc.completedCount > 0 ? acc.painSum / acc.completedCount : 0;
      const flaggedRate = acc.completedCount > 0 ? acc.flaggedCount / acc.completedCount : 0;

      let status: MuscleFocusStatus | null = null;
      if (avgPain >= NEEDS_ATTENTION_AVG_PAIN || flaggedRate >= NEEDS_ATTENTION_FLAGGED_RATE) {
        status = 'needsAttention';
      } else if (completionRate >= GOING_WELL_COMPLETION_RATE && avgPain <= GOING_WELL_AVG_PAIN) {
        status = 'goingWell';
      }
      if (!status) continue;

      result.push({ muscleGroup, status, instanceCount: acc.instanceCount, completionRate, avgPain, flaggedRate });
    }

    return result;
  }, [logs, routines]);

  return {
    needsAttention: groups.filter((g) => g.status === 'needsAttention').map((g) => g.muscleGroup),
    goingWell: groups.filter((g) => g.status === 'goingWell').map((g) => g.muscleGroup),
    isLoading: isLoadingLogs || isLoadingRoutines,
  };
}
