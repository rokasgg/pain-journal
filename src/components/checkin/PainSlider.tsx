import Slider from '@react-native-community/slider';
import { Text, View, useColorScheme } from 'react-native';

import { InfoButton } from '@/components/ui/InfoButton';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { colors } from '@/lib/theme';

export interface PainSliderProps {
  label: string;
  value: number | null;
  onChange: (value: number) => void;
  className?: string;
  minLabel?: string;
  maxLabel?: string;
  info?: string;
}

export function PainSlider({
  label,
  value,
  onChange,
  className,
  minLabel,
  maxLabel,
  info,
}: PainSliderProps) {
  const { t } = useTranslation();
  const resolvedMinLabel = minLabel ?? t('checkin.none');
  const resolvedMaxLabel = maxLabel ?? t('checkin.severe');
  const isDark = useColorScheme() === 'dark';
  const trackColor = isDark ? colors.primaryDark : colors.primary;

  return (
    <View className={`gap-2 ${className ?? ''}`}>
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-1.5">
          <Text className="text-sm font-medium text-strongGray dark:text-white">{label}</Text>
          {info && <InfoButton title={label} message={info} />}
        </View>
        <Text className="text-base font-bold text-strongGray dark:text-white">{value ?? 0}</Text>
      </View>

      <Slider
        minimumValue={0}
        maximumValue={10}
        step={1}
        value={value ?? 0}
        onValueChange={onChange}
        minimumTrackTintColor={colors.strongGray}
        maximumTrackTintColor={isDark ? colors.primary : colors.borderLight}
        thumbTintColor={trackColor}
        accessibilityLabel={label}
      />

      <View className="flex-row justify-between">
        <Text className="text-xs text-gray dark:text-gray">{resolvedMinLabel}</Text>
        <Text className="text-xs text-gray dark:text-gray">{resolvedMaxLabel}</Text>
      </View>
    </View>
  );
}
