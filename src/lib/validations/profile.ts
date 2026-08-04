import { z } from 'zod';

export const editProfileSchema = z.object({
  name: z.string().min(1, 'validation.nameRequired'),
  avatarUri: z.string().nullable(),
});

export type EditProfileFormData = z.infer<typeof editProfileSchema>;
