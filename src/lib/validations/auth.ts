import { z } from 'zod';

// Messages are stable i18n keys, not literal English — Zod schemas are built
// at module load time, before any component (and thus useTranslation()) can
// run, so screens run `errors.field?.message` through `t(...)` when reading
// it (see login.tsx/register.tsx/forgot-password.tsx).
export const loginSchema = z.object({
  email: z.string().min(1, 'validation.emailRequired').email('validation.emailInvalid'),
  password: z.string().min(1, 'validation.passwordRequired').min(6, 'validation.passwordMinLength'),
});

export type LoginFormData = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    name: z.string().min(1, 'validation.nameRequired'),
    email: z.string().min(1, 'validation.emailRequired').email('validation.emailInvalid'),
    password: z.string().min(1, 'validation.passwordRequired').min(6, 'validation.passwordMinLength'),
    confirmPassword: z.string().min(1, 'validation.confirmPasswordRequired'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'validation.passwordsDoNotMatch',
    path: ['confirmPassword'],
  });

export type RegisterFormData = z.infer<typeof registerSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().min(1, 'validation.emailRequired').email('validation.emailInvalid'),
});

export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;
