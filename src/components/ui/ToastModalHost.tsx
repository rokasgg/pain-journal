import * as Haptics from 'expo-haptics';
import { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';

import { AnimatedCheckmark } from '@/components/ui/AnimatedCheckmark';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { colors } from '@/lib/theme';
import { useToastModalStore } from '@/store/useToastModalStore';

const CONFIRM_BUTTON_STYLES: Record<'success' | 'info' | 'destructive', string> = {
  // Bone-white/outline rather than solid primary — the checkmark above is
  // already the visual focal point for a success toast, so the button stays
  // quiet instead of competing with it.
  success: 'bg-bone border border-gray-300 dark:bg-surfaceDark dark:border-gray-700',
  info: 'bg-primary dark:bg-primaryDark',
  destructive: 'bg-red-600 dark:bg-red-500',
};

const CONFIRM_BUTTON_TEXT_STYLES: Record<'success' | 'info' | 'destructive', string> = {
  success: 'text-black dark:text-white',
  info: 'text-white',
  destructive: 'text-white',
};

// Renders as a plain in-tree overlay rather than RN's <Modal> (which
// ConfirmModal normally uses) — a real native Modal presenting at the same
// moment a navigator-modal screen is being dismissed (the toast-after-save
// flow: save → dismiss modal screen → show result toast) caused the two
// native transitions to race and freeze input, especially on Android.
// A plain absolutely-positioned View can't conflict with navigation at the
// native level, so this sidesteps the problem entirely. Rendered once at
// the root, after the Stack, so later paint order puts it on top.
export function ToastModalHost() {
  const { t } = useTranslation();
  const visible = useToastModalStore((state) => state.visible);
  const message = useToastModalStore((state) => state.message);
  const variant = useToastModalStore((state) => state.variant);
  const hide = useToastModalStore((state) => state.hide);

  // ToastModalHost itself is mounted once, permanently, from the root
  // layout — only the JSX it returns is conditionally null, unlike
  // AnimatedCheckmark below (which genuinely mounts/unmounts as `visible`
  // toggles). So this needs `visible` in the deps to fire on every new toast
  // display, not just once ever on app start. No haptic for
  // 'info'/'destructive', matching the checkmark's success-only scoping.
  useEffect(() => {
    if (visible && variant === 'success') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [visible, variant]);

  if (!visible) return null;

  return (
    <View className="absolute inset-0 items-center justify-center bg-black/50 px-6">
      <View className="w-full max-w-sm items-center gap-4 rounded-2xl bg-surface p-5 dark:bg-surfaceDark">
        {variant === 'success' && (
          // Fresh mount every time this overlay becomes visible (the early
          // `if (!visible) return null` above unmounts it when hidden), so
          // the animation always replays from the start for each toast.
          <AnimatedCheckmark size={48} color={colors.primary} strokeWidth={3} />
        )}

        <Text className="text-center text-lg font-semibold text-black dark:text-white">{message}</Text>

        <Pressable
          onPress={hide}
          className={`w-full items-center rounded-lg py-3 ${CONFIRM_BUTTON_STYLES[variant]}`}
        >
          <Text className={`font-semibold ${CONFIRM_BUTTON_TEXT_STYLES[variant]}`}>{t('common.done')}</Text>
        </Pressable>
      </View>
    </View>
  );
}
