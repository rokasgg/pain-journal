import { Ionicons } from '@expo/vector-icons';
import { Pressable, View } from 'react-native';

import { colors } from '@/lib/theme';
import { haptics } from '@/utils/haptics';

export interface IconSegment<K extends string> {
  key: K;
  icon: keyof typeof Ionicons.glyphMap;
  label: string; // accessibility label
}

export interface IconSegmentedControlProps<K extends string> {
  segments: readonly IconSegment<K>[];
  value: K;
  onChange: (key: K) => void;
  accessibilityLabel?: string;
  className?: string;
}

const SELECTED_SHADOW = '0px 1px 3px rgba(0, 0, 0, 0.1)';

// Compact icon-only segmented control (History header: Charts / Calendar).
// Track #E3E8E4, radius 12, padding 3; segments 48×38, radius 9. The
// selected segment is a white pill with a subtle shadow and an accent icon.
// Every segment renders the same classes and the pill is an always-present
// layer toggled via style — a selection change never swaps classes on a
// mounted element (NativeWind upgrade gotcha, CLAUDE.md).
export function IconSegmentedControl<K extends string>({
  segments,
  value,
  onChange,
  accessibilityLabel,
  className,
}: IconSegmentedControlProps<K>) {
  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
      className={`flex-row rounded-xl bg-segmentTrack p-[3px] dark:bg-segmentTrackDark ${className ?? ''}`}
    >
      {segments.map((segment) => {
        const selected = segment.key === value;
        return (
          <Pressable
            key={segment.key}
            onPress={() => {
              if (selected) return;
              haptics.tick();
              onChange(segment.key);
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={segment.label}
            className="h-[38px] w-12 items-center justify-center"
          >
            <View
              pointerEvents="none"
              className="absolute inset-0 rounded-[9px] bg-surface dark:bg-surfaceDark"
              style={{ opacity: selected ? 1 : 0, boxShadow: selected ? SELECTED_SHADOW : undefined }}
            />
            <Ionicons name={segment.icon} size={20} color={selected ? colors.accent : colors.inkSecondary} />
          </Pressable>
        );
      })}
    </View>
  );
}
