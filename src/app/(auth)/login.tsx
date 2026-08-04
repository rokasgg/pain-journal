import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { ActivityIndicator, Pressable, ScrollView, Text } from 'react-native';

import { Input } from '@/components/ui/Input';
import { colors } from '@/lib/theme';
import { loginSchema, type LoginFormData } from '@/lib/validations/auth';
import { useAuthStore } from '@/store/useAuthStore';
import { skipAuthForDev } from '@/utils/devAuth';
import { toast } from '@/utils/toast';

export default function LoginScreen() {
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

    toast.success('Welcome back!');
  };

  return (
    <ScrollView
      className="flex-1 bg-background dark:bg-backgroundDark"
      contentContainerClassName="flex-grow justify-center gap-4 px-6 py-8"
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
    >
      <Text className="mb-1 text-center text-2xl font-bold text-primary dark:text-primaryDark">
        Pain Journal
      </Text>
      <Text className="mb-4 text-center text-sm text-gray-500 dark:text-gray-400">
        Log in to continue tracking your recovery.
      </Text>

      <Controller
        control={control}
        name="email"
        render={({ field: { onChange, onBlur, value } }) => (
          <Input
            label="Email"
            placeholder="you@example.com"
            autoCapitalize="none"
            keyboardType="email-address"
            onChangeText={onChange}
            onBlur={onBlur}
            value={value}
            error={errors.email?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="password"
        render={({ field: { onChange, onBlur, value } }) => (
          <Input
            label="Password"
            placeholder="••••••••"
            isPassword
            onChangeText={onChange}
            onBlur={onBlur}
            value={value}
            error={errors.password?.message}
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
          <Text className="font-semibold text-white">Log In</Text>
        )}
      </Pressable>

      <Link href="/(auth)/forgot-password" asChild>
        <Pressable className="items-center py-1">
          <Text className="text-sm text-black dark:text-white">Forgot password?</Text>
        </Pressable>
      </Link>

      <Link href="/(auth)/register" asChild>
        <Pressable className="items-center py-3">
          <Text className="text-black dark:text-white">
            Don&apos;t have an account? Register
          </Text>
        </Pressable>
      </Link>

      {__DEV__ && (
        <Pressable onPress={skipAuthForDev} className="items-center py-1">
          <Text className="text-xs text-gray-400 dark:text-gray-600">
            Skip login (dev only)
          </Text>
        </Pressable>
      )}
    </ScrollView>
  );
}
