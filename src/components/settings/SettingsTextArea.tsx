import { forwardRef } from 'react';
import { Text, TextInput, View, type TextInputProps } from 'react-native';

import { KEYBOARD_DONE_BAR_ID } from '@/components/ui/KeyboardDoneBar';
import { colors } from '@/lib/theme';

export interface SettingsTextAreaProps extends TextInputProps {
  // Shows "n / max" in the corner and caps input at this length.
  maxLength?: number;
  className?: string;
}

// Multi-line text card for settings pages (design from
// assets/possible-app-design/injury): the whole card is the input, with an
// optional character counter. Same contract as `Input` — forwarded ref, RN
// props spread — and, being multiline, it attaches the shared iOS "Done"
// keyboard bar.
export const SettingsTextArea = forwardRef<TextInput, SettingsTextAreaProps>(function SettingsTextArea(
  { maxLength, className, value, ...props },
  ref,
) {
  return (
    <View className={`gap-2 rounded-3xl bg-surface p-4 dark:bg-surfaceDark ${className ?? ''}`}>
      <TextInput
        ref={ref}
        multiline
        textAlignVertical="top"
        maxLength={maxLength}
        value={value}
        placeholderTextColor={colors.gray}
        inputAccessoryViewID={KEYBOARD_DONE_BAR_ID}
        className="min-h-28 py-0 text-body text-black dark:text-white"
        {...props}
      />
      {maxLength !== undefined && (
        <Text className="self-end text-caption text-gray">
          {(value ?? '').length} / {maxLength}
        </Text>
      )}
    </View>
  );
});
