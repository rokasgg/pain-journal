import { Pressable, Text, View } from 'react-native';

import { InfoButton } from '@/components/ui/InfoButton';
import { useTranslation } from '@/lib/i18n/useTranslation';

export interface YesNoFieldProps {
  label: string;
  value: boolean | null;
  onChange: (value: boolean) => void;
  info?: string;
  className?: string;
}

export function YesNoField({ label, value, onChange, info, className }: YesNoFieldProps) {
  const { t } = useTranslation();

  return (
    <Pressable
      onPress={() => onChange(!value)}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: !!value }}
      className={`flex-row items-center justify-between rounded-lg border border-gray-300 px-4 py-3 dark:border-gray-700 ${className ?? ''}`}
    >
      <View className="flex-row items-center gap-1.5">
        <Text className="text-base text-black dark:text-white">{label}</Text>
        {info && <InfoButton title={label} message={info} />}
      </View>
      <Text className="text-sm font-medium text-gray-500 dark:text-gray">
        {value ? t('common.yes') : t('common.no')}
      </Text>
    </Pressable>
  );
}
