import { Modal, Pressable, Text, View } from 'react-native';

import { useTranslation } from '@/lib/i18n/useTranslation';

type ConfirmModalVariant = 'default' | 'destructive';

const CONFIRM_BUTTON_STYLES: Record<ConfirmModalVariant, string> = {
  default: 'bg-primary dark:bg-primaryDark',
  destructive: 'bg-red-600 dark:bg-red-500',
};

export interface ConfirmModalProps {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Omit to render an informative single-button modal (confirm doubles as close). */
  onCancel?: () => void;
  onConfirm: () => void;
  variant?: ConfirmModalVariant;
}

export function ConfirmModal({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onCancel,
  onConfirm,
  variant = 'default',
}: ConfirmModalProps) {
  const { t } = useTranslation();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel ?? onConfirm}>
      <View className="flex-1 items-center justify-center bg-black/50 px-6">
        <View className="w-full max-w-sm gap-4 rounded-2xl bg-surface p-5 dark:bg-surfaceDark">
          <View className="gap-1">
            <Text className="text-center text-lg font-semibold text-black dark:text-white">{title}</Text>
            {message ? (
              <Text className="text-center text-sm text-gray-500 dark:text-gray">{message}</Text>
            ) : null}
          </View>

          <View className="flex-row gap-3">
            {onCancel ? (
              <Pressable
                onPress={onCancel}
                className="flex-1 items-center rounded-lg border border-gray-300 py-3 dark:border-gray-700"
              >
                <Text className="font-semibold text-black dark:text-white">
                  {cancelLabel ?? t('common.cancel')}
                </Text>
              </Pressable>
            ) : null}

            <Pressable
              onPress={onConfirm}
              className={`flex-1 items-center rounded-lg py-3 ${CONFIRM_BUTTON_STYLES[variant]}`}
            >
              <Text className="font-semibold text-white">{confirmLabel ?? t('common.done')}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
