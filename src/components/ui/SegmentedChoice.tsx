import { Pressable, Text, View } from 'react-native';

import { haptics } from '@/utils/haptics';

export interface SegmentedChoiceOption<T extends string | boolean> {
  value: T;
  label: string;
}

export interface SegmentedChoiceProps<T extends string | boolean> {
  options: SegmentedChoiceOption<T>[];
  // null = not answered yet — no segment is highlighted.
  value: T | null;
  onChange: (value: T) => void;
  accessibilityLabel?: string;
  // Red outline for a required-answer error.
  hasError?: boolean;
}

// Grey track with a raised white pill under the selected option (design:
// "Taip | Ne", "Jau praėjo | Dar tęsiasi | Nežinau"). The pill is an
// always-rendered layer whose opacity is the only thing that changes, and the
// label's colour classes are the same in every state — so selecting never
// swaps classes on a mounted element (NativeWind remount gotcha).
export function SegmentedChoice<T extends string | boolean>({
  options,
  value,
  onChange,
  accessibilityLabel,
  hasError = false,
}: SegmentedChoiceProps<T>) {
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
      className="flex-row rounded-2xl border border-transparent bg-segmentTrack p-1 dark:bg-segmentTrackDark"
      style={hasError ? { borderColor: '#dc2626' } : undefined}
    >
      {options.map((option) => {
        const isSelected = value === option.value;
        return (
          <Pressable
            key={String(option.value)}
            onPress={() => {
              if (isSelected) return;
              haptics.tick();
              onChange(option.value);
            }}
            accessibilityRole="radio"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={accessibilityLabel ? `${accessibilityLabel}: ${option.label}` : option.label}
            className="h-12 flex-1 items-center justify-center rounded-xl"
          >
            <View
              className="absolute inset-0 rounded-xl bg-surface shadow-sm dark:bg-surfaceDark"
              style={{ opacity: isSelected ? 1 : 0 }}
            />
            <Text
              className="text-[14px] text-ink dark:text-white"
              style={{ fontWeight: isSelected ? '700' : '400', opacity: isSelected ? 1 : 0.7 }}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
