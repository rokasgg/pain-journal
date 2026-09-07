import { z } from 'zod';

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
});

export type PhysioQuestionFormData = z.infer<typeof physioQuestionSchema>;
export type PhysioAssessmentFormData = z.infer<typeof physioAssessmentSchema>;
