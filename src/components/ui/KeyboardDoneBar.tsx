import { InputAccessoryView, Keyboard, Platform, Pressable, Text, View } from 'react-native';

import { useTranslation } from '@/lib/i18n/useTranslation';

// Shared "Done" toolbar above the iOS keyboard for multiline fields, where
// Return inserts a newline and there's otherwise no way to close the
// keyboard. Mounted once at the root; any TextInput opts in with
// `inputAccessoryViewID={KEYBOARD_DONE_BAR_ID}` (Input does this
// automatically when `multiline`). Android has its own hide-keyboard key and
// no InputAccessoryView, so this renders nothing there.
export const KEYBOARD_DONE_BAR_ID = 'keyboard-done-bar';

export function KeyboardDoneBar() {
  const { t } = useTranslation();

  if (Platform.OS !== 'ios') return null;

  return (
    <InputAccessoryView nativeID={KEYBOARD_DONE_BAR_ID}>
      <View className="flex-row justify-end border-t border-gray-200 bg-surface px-4 py-2 dark:border-gray-800 dark:bg-surfaceDark">
        <Pressable onPress={() => Keyboard.dismiss()} hitSlop={8} accessibilityRole="button">
          <Text className="text-base font-semibold text-primary dark:text-white">{t('common.done')}</Text>
        </Pressable>
      </View>
    </InputAccessoryView>
  );
}
