import { Ionicons } from '@expo/vector-icons';
import { forwardRef } from 'react';
import { Pressable, Text, TextInput, View, type TextInputProps } from 'react-native';

import { colors } from '@/lib/theme';

export interface SettingsFieldRowProps extends TextInputProps {
  label: string;
  // Read-only rows show the value as text with a lock icon (e.g. sign-in email).
  readOnly?: boolean;
  clearAccessibilityLabel?: string;
  // Injected by SettingsSection.
  isLast?: boolean;
  className?: string;
}

// "Label  value" row for editing a single field inline inside a settings
// card (design from assets/possible-app-design/setting/Edit profile.png):
// fixed-width label, the input filling the rest, and a clear (✕) button while
// there's text. Same contract as `Input` — forwarded ref, RN props spread —
// so it works as a react-hook-form Controller target. Validation errors are
// rendered by the caller under the card (SettingsSection footer area).
export const SettingsFieldRow = forwardRef<TextInput, SettingsFieldRowProps>(function SettingsFieldRow(
  { label, readOnly = false, clearAccessibilityLabel, isLast, className, value, onChangeText, ...props },
  ref,
) {
  return (
    <View className={`flex-row pl-4 ${className ?? ''}`}>
      <View
        className={`min-h-14 flex-1 flex-row items-center gap-3 py-3 pr-4 ${
          isLast ? '' : 'border-b border-borderLight dark:border-borderDark'
        }`}
      >
        <Text className="w-24 text-base text-black dark:text-white">{label}</Text>
        {readOnly ? (
          <>
            <Text className="flex-1 text-base text-gray" numberOfLines={1}>
              {value}
            </Text>
            <Ionicons name="lock-closed-outline" size={16} color={colors.gray} />
          </>
        ) : (
          <>
            <TextInput
              ref={ref}
              value={value}
              onChangeText={onChangeText}
              placeholderTextColor={colors.gray}
              className="flex-1 py-0 text-base text-black dark:text-white"
              {...props}
            />
            {!!value && (
              <Pressable
                onPress={() => onChangeText?.('')}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel={clearAccessibilityLabel}
              >
                <Ionicons name="close-circle" size={20} color={colors.gray} />
              </Pressable>
            )}
          </>
        )}
      </View>
    </View>
  );
});
