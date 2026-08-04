import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { ActivityIndicator, Pressable, ScrollView, Text } from 'react-native';

import { Input } from '@/components/ui/Input';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { colors } from '@/lib/theme';
import { forgotPasswordSchema, type ForgotPasswordFormData } from '@/lib/validations/auth';
import { useAuthStore } from '@/store/useAuthStore';
import { toast } from '@/utils/toast';

export default function ForgotPasswordScreen() {
  const { t } = useTranslation();
  const resetPassword = useAuthStore((state) => state.resetPassword);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsSubmitting(true);
    const { error } = await resetPassword(data.email);
    setIsSubmitting(false);

    if (error) {
      toast.error(error);
      return;
    }

    toast.success(t('auth.passwordResetEmailSent'));
  };

  return (
    <ScrollView
      className="flex-1 bg-background dark:bg-backgroundDark"
      contentContainerClassName="flex-grow justify-center gap-4 px-6 py-8"
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
    >
      <Text className="mb-4 text-center text-2xl font-bold text-primary dark:text-primaryDark">
        {t('auth.resetPasswordTitle')}
      </Text>

      <Controller
        control={control}
        name="email"
        render={({ field: { onChange, onBlur, value } }) => (
          <Input
            label={t('auth.emailLabel')}
            placeholder={t('auth.emailPlaceholder')}
            autoCapitalize="none"
            keyboardType="email-address"
            onChangeText={onChange}
            onBlur={onBlur}
            value={value}
            error={errors.email?.message && t(errors.email.message)}
          />
        )}
      />

      <Pressable
        onPress={handleSubmit(onSubmit)}
        disabled={isSubmitting}
        className="mt-2 items-center rounded-lg bg-primary py-3 disabled:opacity-50 dark:bg-primaryDark"
      >
        {isSubmitting ? (
          <ActivityIndicator color={colors.white} />
        ) : (
          <Text className="font-semibold text-white">{t('auth.sendResetLink')}</Text>
        )}
      </Pressable>

      <Link href="/(auth)/login" asChild>
        <Pressable className="items-center py-3">
          <Text className="text-black dark:text-white">{t('auth.backToLogin')}</Text>
        </Pressable>
      </Link>
    </ScrollView>
  );
}
