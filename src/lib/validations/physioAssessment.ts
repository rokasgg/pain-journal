import { z } from 'zod';

export const muscleFindingSchema = z.object({
  muscle_name: z.string().min(1, 'validation.nameRequired'),
  status: z.enum(['weak', 'tight', 'normal', 'improving']),
  side: z.enum(['left', 'right', 'bilateral']).nullable(),
  severity: z.number().min(0, 'validation.mustBeBetween0And10').max(10, 'validation.mustBeBetween0And10').nullable(),
  notes: z.string().nullable(),
});

export const physioQuestionSchema = z.object({
  id: z.string(),
  text: z.string().min(1),
  discussed: z.boolean(),
  answer: z.string().nullable(),
  created_before_visit: z.boolean(),
});

export const physioAssessmentSchema = z.object({
  visit_date: z.string(),
  physio_name: z.string().nullable(),
  overall_notes: z.string().nullable(),
  next_visit_date: z.string().nullable(),
  questions: z.array(physioQuestionSchema),
  findings: z.array(muscleFindingSchema).min(1, 'validation.atLeastOneMuscle'),
});

export type MuscleFindingFormData = z.infer<typeof muscleFindingSchema>;
export type PhysioQuestionFormData = z.infer<typeof physioQuestionSchema>;
export type PhysioAssessmentFormData = z.infer<typeof physioAssessmentSchema>;
