import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, useColorScheme, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { SLEEP_POSITION_OPTIONS } from '@/constants/symptoms';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { colors } from '@/lib/theme';
import { haptics } from '@/utils/haptics';

type PositionKind = 'back' | 'side' | 'stomach';

// A sleeper drawn inside a bed outline (ported from the mockup's SVGs).
function SleepPositionIcon({ kind, color }: { kind: PositionKind; color: string }) {
  const stroke = { stroke: color, strokeLinecap: 'round', strokeLinejoin: 'round', fill: 'none' } as const;
  return (
    <Svg width={40} height={56} viewBox="0 0 40 56">
      <Rect x={3} y={2} width={34} height={52} rx={7} fill="none" stroke={color} strokeOpacity={0.3} strokeWidth={1.6} />
      <Rect x={11} y={5.5} width={18} height={8} rx={4} fill={color} fillOpacity={0.18} />
      {kind === 'back' && (
        <>
          <Circle cx={20} cy={11} r={4.4} fill={color} />
          <Path d="M20 19.5V31" strokeWidth={9} {...stroke} />
          <Path d="M13.2 19.8L12.8 31.5M26.8 19.8L27.2 31.5" strokeWidth={3.4} {...stroke} />
          <Path d="M17.7 35L17.4 49.5M22.3 35L22.6 49.5" strokeWidth={4.4} {...stroke} />
        </>
      )}
      {kind === 'side' && (
        <>
          <Circle cx={18.5} cy={12} r={4.4} fill={color} />
          <Path d="M18.5 20Q15.8 26 19.6 32.5" strokeWidth={8} {...stroke} />
          <Path d="M19.5 34L25.5 41.5L19 48.5" strokeWidth={4.4} strokeOpacity={0.5} {...stroke} />
          <Path d="M20 33.5L29 38L23.5 48.5" strokeWidth={4.4} {...stroke} />
          <Path d="M21 21.5L27.5 21.5L25.5 15.5" strokeWidth={3.4} {...stroke} />
        </>
      )}
      {kind === 'stomach' && (
        <>
          <Circle cx={20} cy={12} r={4.4} fill={color} />
          <Path d="M20 20.5V31.5" strokeWidth={9} {...stroke} />
          <Path d="M14.6 20.5L9.5 14.5L15 9.5M25.4 20.5L30.5 14.5L25 9.5" strokeWidth={3.4} {...stroke} />
          <Path d="M22.3 35.5L23 49.5M17.7 35.5L12.5 41.5L15 49.5" strokeWidth={4.4} {...stroke} />
        </>
      )}
    </Svg>
  );
}

export interface SleepPositionPickerProps {
  value: string[];
  onChange: (value: string[]) => void;
}

// "Miego padėtis" (design: "Rytas – miegas"): three body-position tiles, more
// than one can be picked. Selected
// state is applied through `style` (stable classNames — NativeWind remount
// gotcha), and the ✓ badge is an always-rendered layer shown via opacity.
export function SleepPositionPicker({ value, onChange }: SleepPositionPickerProps) {
  const { t } = useTranslation();
  const isDark = useColorScheme() === 'dark';
  const selectedFill = isDark ? colors.segmentTrackDark : colors.accentMuted;
  const accent = isDark ? colors.primaryDark : colors.accent;
  const idleFill = isDark ? colors.surfaceDark : '#FFFFFF';
  const idleIcon = isDark ? colors.gray : '#7C8A82';
  const labelColor = isDark ? colors.white : colors.ink;

  const toggle = (position: string) => {
    haptics.tick();
    onChange(value.includes(position) ? value.filter((v) => v !== position) : [...value, position]);
  };

  return (
    <View className="gap-3">
      <View className="flex-row gap-2">
        {SLEEP_POSITION_OPTIONS.map((option) => {
          const isSelected = value.includes(option.value);
          return (
            <Pressable
              key={option.value}
              onPress={() => toggle(option.value)}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={t(`sleepPosition.${option.value}`)}
              className="h-[118px] flex-1 items-center justify-center gap-2 rounded-2xl border-2"
              style={{
                backgroundColor: isSelected ? selectedFill : idleFill,
                borderColor: isSelected ? accent : 'transparent',
              }}
            >
              <SleepPositionIcon kind={option.value} color={isSelected ? accent : idleIcon} />
              <Text
                className="text-sm"
                style={{ color: labelColor, fontWeight: isSelected ? '600' : '500' }}
              >
                {t(`sleepPosition.${option.value}`)}
              </Text>
              <View
                className="absolute right-2 top-2 h-5 w-5 items-center justify-center rounded-full"
                style={{ backgroundColor: accent, opacity: isSelected ? 1 : 0 }}
              >
                <Ionicons name="checkmark" size={12} color={colors.white} />
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
