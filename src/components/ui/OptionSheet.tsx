import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, Text, View } from 'react-native';
import Animated, { SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type OptionTone = 'default' | 'destructive';

export interface SheetOption {
  label: string;
  onPress: () => void;
  tone?: OptionTone;
  disabled?: boolean;
}

export interface OptionSheetProps {
  visible: boolean;
  title?: string;
  message?: string;
  // Extra header content under the message (e.g. ConfirmModal's typed
  // confirmation field).
  children?: ReactNode;
  options: SheetOption[];
  // The separate bottom card. Omit `onCancel` to drop it (e.g. informative
  // dialogs whose single option is already the close action).
  cancelLabel?: string;
  onCancel?: () => void;
  // Tapping the dimmed backdrop / Android back.
  onDismiss: () => void;
}

// Option text colour per tone — variant-map convention (CLAUDE.md). Fixed per
// row for the row's lifetime, so no NativeWind upgrade on re-render.
const OPTION_TEXT_STYLES: Record<OptionTone, string> = {
  default: 'text-primary dark:text-primaryDark',
  destructive: 'text-red-600 dark:text-red-500',
};

// The app's one dialog look (design from assets/possible-app-design/modalmessage):
// an iOS-style action sheet at the bottom — an optional title + message
// header and the option rows in one card, and a separate bold "Cancel" card
// beneath it. ConfirmModal and ActionSheet both render through this, so every
// confirmation and every long-press menu shares it. Still a real <Modal> (so
// it covers the tab bar) — fine for these since they aren't shown right as a
// navigator modal dismisses (see ToastModalHost's note).
export function OptionSheet({
  visible,
  title,
  message,
  children,
  options,
  cancelLabel,
  onCancel,
  onDismiss,
}: OptionSheetProps) {
  const insets = useSafeAreaInsets();
  const hasHeader = !!title || !!message || !!children;

  return (
    <Modal visible={visible} transparent statusBarTranslucent animationType="fade" onRequestClose={onDismiss}>
      {/* Keeps the sheet above the keyboard when it holds an input. */}
      <KeyboardAvoidingView className="flex-1 justify-end" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable className="absolute inset-0 bg-black/40" onPress={onDismiss} accessible={false} />

        <Animated.View
          entering={SlideInDown.duration(260)}
          className="gap-2 px-2.5"
          style={{ paddingBottom: insets.bottom + 8 }}
        >
          <View className="overflow-hidden rounded-2xl bg-white dark:bg-surfaceDark">
            {hasHeader && (
              <View className="items-center gap-1 px-6 py-4">
                {title && (
                  <Text className="text-center text-sm font-semibold text-strongGray dark:text-white">{title}</Text>
                )}
                {message && <Text className="text-center text-sm text-gray">{message}</Text>}
                {children}
              </View>
            )}
            {options.map((option, index) => (
              <Pressable
                key={option.label}
                onPress={option.onPress}
                disabled={option.disabled}
                accessibilityRole="button"
                accessibilityState={{ disabled: !!option.disabled }}
                // Disabled is shown through style, not className, so toggling
                // it never swaps classes on a mounted row (NativeWind upgrade).
                style={{ opacity: option.disabled ? 0.35 : 1 }}
                className={`items-center py-4 active:bg-borderLight dark:active:bg-borderDark ${
                  hasHeader || index > 0 ? 'border-t border-borderLight dark:border-borderDark' : ''
                }`}
              >
                <Text className={`text-xl ${OPTION_TEXT_STYLES[option.tone ?? 'default']}`}>{option.label}</Text>
              </Pressable>
            ))}
          </View>

          {onCancel && (
            <Pressable
              onPress={onCancel}
              accessibilityRole="button"
              className="items-center rounded-2xl bg-white py-4 active:bg-borderLight dark:bg-surfaceDark dark:active:bg-borderDark"
            >
              <Text className="text-xl font-semibold text-primary dark:text-primaryDark">{cancelLabel}</Text>
            </Pressable>
          )}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
