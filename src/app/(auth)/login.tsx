import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { ActivityIndicator, Pressable, ScrollView, Text } from 'react-native';

import { Input } from '@/components/ui/Input';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { colors } from '@/lib/theme';
import { loginSchema, type LoginFormData } from '@/lib/validations/auth';
import { useAuthStore } from '@/store/useAuthStore';
import { skipAuthForDev } from '@/utils/devAuth';
import { toast } from '@/utils/toast';

export default function LoginScreen() {
  const { t } = useTranslation();
  const signIn = useAuthStore((state) => state.signIn);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsSubmitting(true);
    const { error } = await signIn(data.email, data.password);
    setIsSubmitting(false);

    if (error) {
      toast.error(error);
      return;
    }

    toast.success(t('auth.welcomeBack'));
  };

  return (
    <ScrollView
      className="flex-1 bg-background dark:bg-backgroundDark"
      contentContainerClassName="flex-grow justify-center gap-4 px-6 py-8"
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
    >
      <Text className="mb-1 text-center text-2xl font-bold text-primary dark:text-primaryDark">
        {t('auth.appTitle')}
      </Text>
      <Text className="mb-4 text-center text-sm text-gray-500 dark:text-gray">
        {t('auth.loginSubtitle')}
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

      <Pressable
        onPress={handleSubmit(onSubmit)}
        disabled={isSubmitting}
        className="mt-2 items-center rounded-lg bg-primary py-3 disabled:opacity-50 dark:bg-primaryDark"
      >
        {isSubmitting ? (
          <ActivityIndicator color={colors.white} />
        ) : (
          <Text className="font-semibold text-white">{t('auth.logIn')}</Text>
        )}
      </Pressable>

      <Link href="/(auth)/forgot-password" asChild>
        <Pressable className="items-center py-1">
          <Text className="text-sm text-black dark:text-white">{t('auth.forgotPassword')}</Text>
        </Pressable>
      </Link>

      <Link href="/(auth)/register" asChild>
        <Pressable className="items-center py-3">
          <Text className="text-black dark:text-white">
            {t('auth.noAccountRegister')}
          </Text>
        </Pressable>
      </Link>

      {__DEV__ && (
        <Pressable onPress={skipAuthForDev} className="items-center py-1">
          <Text className="text-xs text-gray dark:text-gray-600">
            {t('auth.skipLoginDev')}
          </Text>
        </Pressable>
      )}
    </ScrollView>
  );
}
