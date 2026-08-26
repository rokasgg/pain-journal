import { Ionicons } from '@expo/vector-icons';
import { Pressable, View } from 'react-native';

import { useTranslation } from '@/lib/i18n/useTranslation';
import { colors } from '@/lib/theme';

const TOTAL_STEPS = 4;

export interface WizardProgressProps {
  step: number;
  onClose: () => void;
}

export function WizardProgress({ step, onClose }: WizardProgressProps) {
  const { t } = useTranslation();

  return (
    <View className="flex-row items-center justify-between px-2 pt-2">
      <Pressable
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel={t('common.cancel')}
        hitSlop={8}
        className="h-11 w-11 items-center justify-center"
      >
        <Ionicons name="close" size={22} color={colors.gray} />
      </Pressable>

      <View className="flex-row items-center gap-1.5 pr-4">
        {Array.from({ length: TOTAL_STEPS }, (_, index) => {
          const isCurrent = index === step - 1;
          const isDone = index < step - 1;
          return (
            <View
              key={index}
              className={`rounded-full ${isCurrent
                ? 'h-2.5 w-2.5 bg-primary dark:bg-primaryDark'
                : isDone
                  ? 'h-2 w-2 bg-primary/50 dark:bg-primaryDark/50'
                  : 'h-2 w-2 bg-gray dark:bg-gray-600'
                }`}
            />
          );
        })}
      </View>
    </View>
  );
}
