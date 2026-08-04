import Slider from '@react-native-community/slider';
import { Text, View, useColorScheme } from 'react-native';

import { InfoButton } from '@/components/ui/InfoButton';
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
  minLabel = 'None',
  maxLabel = 'Severe',
  info,
}: PainSliderProps) {
  const isDark = useColorScheme() === 'dark';
  const trackColor = isDark ? colors.primaryDark : colors.primary;

  return (
    <View className={`gap-2 ${className ?? ''}`}>
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-1.5">
          <Text className="text-sm font-medium text-black dark:text-white">{label}</Text>
          {info && <InfoButton title={label} message={info} />}
        </View>
        <Text className="text-base font-bold text-black dark:text-white">{value ?? 0}</Text>
      </View>

      <Slider
        minimumValue={0}
        maximumValue={10}
        step={1}
        value={value ?? 0}
        onValueChange={onChange}
        minimumTrackTintColor={trackColor}
        maximumTrackTintColor={isDark ? colors.borderDark : colors.borderLight}
        thumbTintColor={trackColor}
        accessibilityLabel={label}
      />

      <View className="flex-row justify-between">
        <Text className="text-xs text-gray-500 dark:text-gray-400">{minLabel}</Text>
        <Text className="text-xs text-gray-500 dark:text-gray-400">{maxLabel}</Text>
      </View>
    </View>
  );
}
