import { Ionicons } from '@expo/vector-icons';
import { forwardRef, useState } from 'react';
import { Pressable, Text, TextInput, View, type TextInputProps } from 'react-native';

import { InfoButton } from '@/components/ui/InfoButton';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { colors } from '@/lib/theme';

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  isPassword?: boolean;
  className?: string;
  labelClassName?: string;
  info?: string;
}

export const Input = forwardRef<TextInput, InputProps>(function Input(
  { label, error, isPassword, className, labelClassName, info, secureTextEntry, ...props },
  ref,
) {
  const { t } = useTranslation();
  const [isVisible, setIsVisible] = useState(false);
  const hideText = isPassword ? !isVisible : secureTextEntry;

  return (
    <View className={`gap-1.5 ${className ?? ''}`}>
      {label && (
        <View className="flex-row items-center gap-1.5">
          <Text className={`text-sm font-medium text-black dark:text-white ${labelClassName ?? ''}`}>
            {label}
          </Text>
          {info && <InfoButton title={label} message={info} />}
        </View>
      )}

      <View className="relative justify-center">
        <TextInput
          ref={ref}
          placeholderTextColor={colors.gray}
          secureTextEntry={hideText}
          className={`rounded-lg border bg-surface px-4 py-3 text-black dark:bg-surfaceDark dark:text-white ${
            error ? 'border-red-600 dark:border-red-500' : 'border-gray-300 dark:border-gray-700'
          } ${isPassword ? 'pr-12' : ''}`}
          {...props}
        />

        {isPassword && (
          <Pressable
            onPress={() => setIsVisible((prev) => !prev)}
            accessibilityRole="button"
            accessibilityLabel={isVisible ? t('input.hidePassword') : t('input.showPassword')}
            className="absolute right-3"
          >
            <Ionicons
              name={isVisible ? 'eye-off' : 'eye'}
              size={20}
              color={colors.gray}
            />
          </Pressable>
        )}
      </View>

      {error && <Text className="text-sm text-red-600 dark:text-red-400">{error}</Text>}
    </View>
  );
});
