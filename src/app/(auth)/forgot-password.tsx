import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { Input } from '@/components/ui/Input';
import { colors } from '@/lib/theme';
import { forgotPasswordSchema, type ForgotPasswordFormData } from '@/lib/validations/auth';
import { useAuthStore } from '@/store/useAuthStore';
import { toast } from '@/utils/toast';

export default function ForgotPasswordScreen() {
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

    toast.success('Password reset email sent!');
  };

  return (
    <View className="flex-1 justify-center gap-4 bg-background px-6 dark:bg-backgroundDark">
      <Text className="mb-4 text-center text-2xl font-bold text-primary dark:text-primaryDark">
        Reset Password
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

      <Pressable
        onPress={handleSubmit(onSubmit)}
        disabled={isSubmitting}
        className="mt-2 items-center rounded-lg bg-primary py-3 disabled:opacity-50 dark:bg-primaryDark"
      >
        {isSubmitting ? (
          <ActivityIndicator color={colors.white} />
        ) : (
          <Text className="font-semibold text-white">Send Reset Link</Text>
        )}
      </Pressable>

      <Link href="/(auth)/login" asChild>
        <Pressable className="items-center py-3">
          <Text className="text-black dark:text-white">Back to Log In</Text>
        </Pressable>
      </Link>
    </View>
  );
}
