import Slider from '@react-native-community/slider';
import { useRef } from 'react';
import { Text, View, useColorScheme } from 'react-native';

import { InfoButton } from '@/components/ui/InfoButton';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { colors } from '@/lib/theme';
import { haptics } from '@/utils/haptics';

export interface PainSliderProps {
  label: string;
  value: number | null;
  onChange: (value: number) => void;
  className?: string;
  minLabel?: string;
  maxLabel?: string;
  // Middle-of-scale description, e.g. "Somewhat stiff". Omit for min/max only.
  midLabel?: string;
  info?: string;
  // While `value` is null, park the thumb at the middle (muted) instead of 0 —
  // for scales where a far-left start would bias answers toward an extreme.
  // The value stays null until touched; it is never saved as 5 by default.
  restAtMidpoint?: boolean;
}

const MIDPOINT = 5;

export function PainSlider({
  label,
  value,
  onChange,
  className,
  minLabel,
  maxLabel,
  midLabel,
  info,
  restAtMidpoint = false,
}: PainSliderProps) {
  const { t } = useTranslation();
  const resolvedMinLabel = minLabel ?? t('checkin.none');
  const resolvedMaxLabel = maxLabel ?? t('checkin.severe');
  const isDark = useColorScheme() === 'dark';
  const trackColor = isDark ? colors.primaryDark : colors.primary;
  const isUnset = value === null;
  const restingValue = restAtMidpoint ? MIDPOINT : 0;
  // onValueChange can fire repeatedly for the same step while dragging —
  // only tick when the number actually changes, so 3→7 is exactly 4 ticks.
  // Starts from where the thumb is drawn, so ticks count from the midpoint.
  const lastValueRef = useRef(value ?? restingValue);

  const handleChange = (next: number) => {
    if (next !== lastValueRef.current) {
      lastValueRef.current = next;
      haptics.tick();
    }
    onChange(next);
  };

  // Tapping/releasing the thumb without moving it never fires onValueChange
  // (the value didn't change) — commit it here so "the middle is right"
  // counts as an answer.
  const handleSlidingComplete = (next: number) => {
    if (isUnset) {
      haptics.tick();
      onChange(next);
    }
  };

  const mutedTrack = isDark ? colors.borderDark : colors.borderLight;

  return (
    <View className={`gap-2 ${className ?? ''}`}>
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-1.5">
          <Text className="text-sm font-medium text-strongGray dark:text-white">{label}</Text>
          {info && <InfoButton title={label} message={info} />}
        </View>
        {/* "—" until touched, so "not answered" never looks like a real 0. */}
        <Text className="text-base font-bold text-strongGray dark:text-white">{value ?? '—'}</Text>
      </View>

      <Slider
        minimumValue={0}
        maximumValue={10}
        step={1}
        value={value ?? restingValue}
        onValueChange={handleChange}
        onSlidingComplete={handleSlidingComplete}
        // Untouched: muted track + gray thumb, so a parked midpoint thumb
        // doesn't read as a chosen value.
        minimumTrackTintColor={isUnset && restAtMidpoint ? mutedTrack : colors.strongGray}
        maximumTrackTintColor={isUnset && restAtMidpoint ? mutedTrack : isDark ? colors.primary : colors.borderLight}
        thumbTintColor={isUnset && restAtMidpoint ? colors.gray : trackColor}
        accessibilityLabel={label}
      />

      <View className="flex-row justify-between">
        <Text className="flex-1 text-xs text-gray dark:text-gray">{resolvedMinLabel}</Text>
        {midLabel && <Text className="flex-1 text-center text-xs text-gray dark:text-gray">{midLabel}</Text>}
        <Text className="flex-1 text-right text-xs text-gray dark:text-gray">{resolvedMaxLabel}</Text>
      </View>
    </View>
  );
}
