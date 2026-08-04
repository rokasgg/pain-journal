import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { ActivityIndicator, Pressable, ScrollView, Text } from 'react-native';

import { Input } from '@/components/ui/Input';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { colors } from '@/lib/theme';
import { registerSchema, type RegisterFormData } from '@/lib/validations/auth';
import { useAuthStore } from '@/store/useAuthStore';
import { toast } from '@/utils/toast';

export default function RegisterScreen() {
  const { t } = useTranslation();
  const signUp = useAuthStore((state) => state.signUp);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', password: '', confirmPassword: '' },
  });

  const onSubmit = async (data: RegisterFormData) => {
    setIsSubmitting(true);
    const { error } = await signUp(data.email, data.password, data.name);
    setIsSubmitting(false);

    if (error) {
      toast.error(error);
      return;
    }

    toast.success(t('auth.checkEmailConfirm'));
  };

  return (
    <ScrollView
      className="flex-1 bg-background dark:bg-backgroundDark"
      contentContainerClassName="flex-grow justify-center gap-4 px-6 py-8"
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
    >
      <Text className="mb-4 text-center text-2xl font-bold text-primary dark:text-primaryDark">
        {t('auth.registerTitle')}
      </Text>

      <Controller
        control={control}
        name="name"
        render={({ field: { onChange, onBlur, value } }) => (
          <Input
            label={t('auth.nameLabel')}
            placeholder={t('auth.namePlaceholder')}
            onChangeText={onChange}
            onBlur={onBlur}
            value={value}
            error={errors.name?.message && t(errors.name.message)}
          />
        )}
      />

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

      <Controller
        control={control}
        name="password"
        render={({ field: { onChange, onBlur, value } }) => (
          <Input
            label={t('auth.passwordLabel')}
            placeholder={t('auth.passwordPlaceholder')}
            isPassword
            onChangeText={onChange}
            onBlur={onBlur}
            value={value}
            error={errors.password?.message && t(errors.password.message)}
          />
        )}
      />

      <Controller
        control={control}
        name="confirmPassword"
        render={({ field: { onChange, onBlur, value } }) => (
          <Input
            label={t('auth.confirmPasswordLabel')}
            placeholder={t('auth.passwordPlaceholder')}
            isPassword
            onChangeText={onChange}
            onBlur={onBlur}
            value={value}
            error={errors.confirmPassword?.message && t(errors.confirmPassword.message)}
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
          <Text className="font-semibold text-white">{t('auth.createAccount')}</Text>
        )}
      </Pressable>

      <Link href="/(auth)/login" asChild>
        <Pressable className="items-center py-3">
          <Text className="text-black dark:text-white">
            {t('auth.haveAccountLogin')}
          </Text>
        </Pressable>
      </Link>
    </ScrollView>
  );
}
