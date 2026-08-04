import { z } from 'zod';

export const flareUpSchema = z.object({
  pain_level: z.number().min(0, 'validation.mustBeBetween0And10').max(10, 'validation.mustBeBetween0And10'),
  likely_cause: z.string().nullable(),
  description: z.string().nullable(),
});

export type FlareUpFormData = z.infer<typeof flareUpSchema>;
