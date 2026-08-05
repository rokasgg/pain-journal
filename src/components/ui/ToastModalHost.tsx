import { Pressable, Text, View } from 'react-native';

import { useTranslation } from '@/lib/i18n/useTranslation';
import { useToastModalStore } from '@/store/useToastModalStore';

const CONFIRM_BUTTON_STYLES: Record<'default' | 'destructive', string> = {
  default: 'bg-primary dark:bg-primaryDark',
  destructive: 'bg-red-600 dark:bg-red-500',
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

  if (!visible) return null;

  return (
    <View className="absolute inset-0 items-center justify-center bg-black/50 px-6">
      <View className="w-full max-w-sm gap-4 rounded-2xl bg-surface p-5 dark:bg-surfaceDark">
        <Text className="text-center text-lg font-semibold text-black dark:text-white">{message}</Text>

        <Pressable
          onPress={hide}
          className={`items-center rounded-lg py-3 ${CONFIRM_BUTTON_STYLES[variant]}`}
        >
          <Text className="font-semibold text-white">{t('common.done')}</Text>
        </Pressable>
      </View>
    </View>
  );
}
