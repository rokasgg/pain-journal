import { z } from 'zod';

export const flareUpSchema = z.object({
  pain_level: z.number().min(0, 'Must be between 0 and 10').max(10, 'Must be between 0 and 10'),
  likely_cause: z.string().nullable(),
  description: z.string().nullable(),
});

export type FlareUpFormData = z.infer<typeof flareUpSchema>;
