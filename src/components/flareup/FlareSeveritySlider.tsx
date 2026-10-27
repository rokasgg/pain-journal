import { useRef, useState } from 'react';
import { Text, View, type LayoutChangeEvent } from 'react-native';

import { useTranslation } from '@/lib/i18n/useTranslation';
import { haptics } from '@/utils/haptics';

export interface FlareSeveritySliderProps {
  value: number;
  onChange: (value: number) => void;
}

const MIN = 1;
const MAX = 10;
const THUMB = 34;
const R = THUMB / 2;

// One colour per level, warm and getting deeper — used for the big number,
// its word, and the thumb ring (design: assets/possible-app-design/flareups).
const LEVEL_COLORS = [
  '#C98A1B',
  '#C47F1F',
  '#BE7424',
  '#B6682A',
  '#AC5B2D',
  '#A04F2C',
  '#8E4426',
  '#7C3A21',
  '#6B311C',
  '#5C2A18',
] as const;

// 10 equal segments, light peach → terracotta, read as one gradient bar
// (no gradient dependency needed).
const TRACK_COLORS = [
  '#FBEBD9',
  '#F9E1CB',
  '#F6D6BC',
  '#F3CBAE',
  '#EFBF9F',
  '#EBB290',
  '#E7A581',
  '#E39874',
  '#DE8B68',
  '#D97F5C',
] as const;

function levelKey(value: number): string {
  if (value <= 2) return 'flareUp.severity1';
  if (value <= 4) return 'flareUp.severity2';
  if (value <= 6) return 'flareUp.severity3';
  if (value <= 8) return 'flareUp.severity4';
  return 'flareUp.severity5';
}

// Flare-up severity, 1–10. Custom (not the native Slider) because the design
// needs a ring-bordered thumb, tick marks and a gradient track. A transparent
// overlay with no children is the responder, so `locationX` is always relative
// to the whole track instead of whichever child was touched.
export function FlareSeveritySlider({ value, onChange }: FlareSeveritySliderProps) {
  const { t } = useTranslation();
  const [width, setWidth] = useState(0);
  const lastRef = useRef(value);
  const shown = Math.min(MAX, Math.max(MIN, value));
  const color = LEVEL_COLORS[shown - 1];
  const span = Math.max(0, width - THUMB);
  const centerFor = (level: number) => R + ((level - MIN) / (MAX - MIN)) * span;

  const setFromX = (x: number) => {
    if (span <= 0) return;
    const fraction = Math.min(1, Math.max(0, (x - R) / span));
    const next = Math.round(MIN + fraction * (MAX - MIN));
    if (next !== lastRef.current) {
      lastRef.current = next;
      haptics.tick();
      onChange(next);
    }
  };

  const step = (delta: number) => {
    const next = Math.min(MAX, Math.max(MIN, shown + delta));
    if (next !== shown) {
      lastRef.current = next;
      haptics.tick();
      onChange(next);
    }
  };

  return (
    <View className="gap-3 rounded-3xl bg-surface p-5 dark:bg-surfaceDark">
      <View className="flex-row items-end justify-between">
        <View className="flex-row items-end gap-3">
          <Text className="text-[52px] font-bold leading-[60px]" style={{ color }}>
            {shown}
          </Text>
          <Text className="pb-2 text-lg font-bold" style={{ color }}>
            {t(levelKey(shown))}
          </Text>
        </View>
        <Text className="pb-2 text-[15px] text-inkSecondary dark:text-gray">{t('flareUp.outOf10')}</Text>
      </View>

      <View
        onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={t('flareUp.severityQuestion')}
        accessibilityValue={{ min: MIN, max: MAX, now: shown }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(event) => step(event.nativeEvent.actionName === 'increment' ? 1 : -1)}
        style={{ height: 44, justifyContent: 'center' }}
      >
        <View className="mx-[17px] h-3 flex-row overflow-hidden rounded-full">
          {TRACK_COLORS.map((segmentColor) => (
            <View key={segmentColor} className="flex-1" style={{ backgroundColor: segmentColor }} />
          ))}
        </View>
        {/* Thumb: position is a runtime value NativeWind can't express. */}
        <View
          pointerEvents="none"
          className="absolute rounded-full border-[3px] bg-white"
          style={{
            width: THUMB,
            height: THUMB,
            left: width > 0 ? centerFor(shown) - R : 0,
            borderColor: color,
            opacity: width > 0 ? 1 : 0,
          }}
        />
        <View
          className="absolute inset-0"
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => true}
          onResponderTerminationRequest={() => false}
          onResponderGrant={(event) => setFromX(event.nativeEvent.locationX)}
          onResponderMove={(event) => setFromX(event.nativeEvent.locationX)}
        />
      </View>

      <View className="mx-[16px] h-3 flex-row justify-between" pointerEvents="none">
        {Array.from({ length: MAX - MIN + 1 }, (_, i) => MIN + i).map((level) => (
          <View
            key={level}
            className="w-[2px] rounded-full bg-borderLight dark:bg-borderDark"
            style={{
              height: level === shown ? 12 : 8,
              backgroundColor: level === shown ? color : undefined,
              alignSelf: 'flex-start',
            }}
          />
        ))}
      </View>

      <View className="flex-row justify-between">
        <Text className="text-md text-inkSecondary dark:text-gray">{t('flareUp.severityMin')}</Text>
        <Text className="text-md text-inkSecondary dark:text-gray">{t('flareUp.severityMax')}</Text>
      </View>
    </View>
  );
}
