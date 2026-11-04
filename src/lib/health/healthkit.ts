import { addDays, startOfDay } from 'date-fns';
import { Platform } from 'react-native';

import { nightWindow, summariseWorkouts, toHealthSleep } from '@/lib/health/healthMapping';
import type { HealthSleep } from '@/lib/sleep';
import type { HealthWorkout } from '@/types/database.types';

// The only file allowed to import @kingstinct/react-native-healthkit. It's
// loaded with a dynamic import() and every call is guarded, so Android, Expo
// Go and builds made before the native module was added get "unavailable"
// instead of a crash (same idea as useVisitReport's expo-print import).
// Read-only: the app never writes to Health.

type HealthKitModule = typeof import('@kingstinct/react-native-healthkit');

const READ_TYPES = [
  'HKCategoryTypeIdentifierSleepAnalysis',
  'HKQuantityTypeIdentifierStepCount',
  'HKWorkoutTypeIdentifier',
] as const;

let modulePromise: Promise<HealthKitModule | null> | null = null;

function loadHealthKit(): Promise<HealthKitModule | null> {
  if (Platform.OS !== 'ios') return Promise.resolve(null);
  modulePromise ??= import('@kingstinct/react-native-healthkit')
    .then((HealthKit) => (HealthKit.isHealthDataAvailable() ? HealthKit : null))
    .catch(() => null);
  return modulePromise;
}

export async function isHealthAvailable(): Promise<boolean> {
  return (await loadHealthKit()) !== null;
}

// Querying a type that was never requested crashes the app, so every read
// first (re)requests access once per launch. iOS shows the sheet only for
// types not asked about before; otherwise this resolves silently. It never
// reveals whether reading was denied: denied just returns no samples.
let authorization: Promise<boolean> | null = null;

export function requestHealthAccess(): Promise<boolean> {
  authorization = (async () => {
    const HealthKit = await loadHealthKit();
    if (!HealthKit) return false;
    try {
      return await HealthKit.requestAuthorization({ toRead: READ_TYPES });
    } catch {
      return false;
    }
  })();
  return authorization;
}

async function authorizedHealthKit(): Promise<HealthKitModule | null> {
  const HealthKit = await loadHealthKit();
  if (!HealthKit) return null;
  const granted = await (authorization ?? requestHealthAccess());
  return granted ? HealthKit : null;
}

// Last night's sleep (18:00 yesterday → 12:00 today), or null.
export async function readLastNightSleep(now: Date): Promise<HealthSleep | null> {
  const HealthKit = await authorizedHealthKit();
  if (!HealthKit) return null;
  const { start, end } = nightWindow(now);
  try {
    const samples = await HealthKit.queryCategorySamples('HKCategoryTypeIdentifierSleepAnalysis', {
      limit: 0,
      filter: { date: { startDate: start, endDate: end } },
    });
    return toHealthSleep(
      samples.map((s) => ({ value: Number(s.value), startDate: s.startDate, endDate: s.endDate })),
      now,
    );
  } catch {
    return null;
  }
}

export interface HealthActivity {
  steps: number | null;
  workouts: HealthWorkout[];
  updatedAt: string;
}

// One calendar day's steps and workouts (local midnight to midnight).
export async function readDayActivity(day: Date, now: Date): Promise<HealthActivity | null> {
  const HealthKit = await authorizedHealthKit();
  if (!HealthKit) return null;
  const date = { startDate: startOfDay(day), endDate: addDays(startOfDay(day), 1) };
  try {
    const [stepStats, workouts] = await Promise.all([
      HealthKit.queryStatisticsForQuantity('HKQuantityTypeIdentifierStepCount', ['cumulativeSum'], {
        filter: { date },
        unit: 'count',
      }),
      HealthKit.queryWorkoutSamples({ limit: 0, filter: { date } }),
    ]);
    const steps = stepStats.sumQuantity?.quantity;
    return {
      steps: steps === undefined ? null : Math.round(steps),
      workouts: summariseWorkouts(
        workouts.map((w) => ({
          activityType: Number(w.workoutActivityType),
          startDate: w.startDate,
          endDate: w.endDate,
          sourceName: w.sourceRevision.source.name,
        })),
      ),
      updatedAt: now.toISOString(),
    };
  } catch {
    return null;
  }
}
