import { Modal, Pressable, Text, View } from 'react-native';

import { useTranslation } from '@/lib/i18n/useTranslation';

export interface ActionSheetAction {
  label: string;
  onPress: () => void;
  destructive?: boolean;
}

export interface ActionSheetProps {
  visible: boolean;
  actions: ActionSheetAction[];
  onCancel: () => void;
  cancelLabel?: string;
}

export function ActionSheet({ visible, actions, onCancel, cancelLabel }: ActionSheetProps) {
  const { t } = useTranslation();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable className="flex-1 justify-end bg-black/50 p-4" onPress={onCancel}>
        <View className="gap-2">
          <View className="overflow-hidden rounded-2xl bg-surface dark:bg-surfaceDark">
            {actions.map((action, index) => (
              <Pressable
                key={action.label}
                onPress={action.onPress}
                className={`items-center py-4 ${index % 2 === 1 ? 'bg-gray-50 dark:bg-gray-800/40' : ''}`}
              >
                <Text
                  className={`text-base font-medium ${
                    action.destructive ? 'text-red-600 dark:text-red-500' : 'text-black dark:text-white'
                  }`}
                >
                  {action.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <Pressable onPress={onCancel} className="items-center rounded-2xl bg-surface py-4 dark:bg-surfaceDark">
            <Text className="text-base font-semibold text-black dark:text-white">
              {cancelLabel ?? t('common.cancel')}
            </Text>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}
