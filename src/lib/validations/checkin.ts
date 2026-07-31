import { z } from 'zod';

const level = z.number().min(0, 'Must be between 0 and 10').max(10, 'Must be between 0 and 10');

const symptomsSchema = z.object({
  tingling: z.boolean().optional(),
  numbness: z.boolean().optional(),
  headache: z.boolean().optional(),
  radiating_to: z.string().optional(),
});

const sharedCheckinFields = z.object({
  pain_level: level,
  stiffness_level: level.nullable(),
  range_of_motion: level.nullable(),
  symptoms: symptomsSchema,
  triggers: z.array(z.string()),
  notes: z.string().nullable(),
});

export const morningCheckinSchema = sharedCheckinFields.extend({
  sleep_quality: level.nullable(),
  sleep_hours: z.number().min(0).max(24).nullable(),
  woke_up_with_pain: z.boolean().nullable(),
  sleep_position: z.enum(['back', 'side', 'stomach']).nullable(),
});

export type MorningCheckinFormData = z.infer<typeof morningCheckinSchema>;

export const eveningCheckinSchema = sharedCheckinFields.extend({
  activity_level: level.nullable(),
  screen_time_hours: z.number().min(0).max(24).nullable(),
  did_exercises: z.boolean().nullable(),
  exercise_notes: z.string().nullable(),
});

export type EveningCheckinFormData = z.infer<typeof eveningCheckinSchema>;
