import { useState } from 'react';
import { Text, View, type LayoutChangeEvent } from 'react-native';

import { useTranslation } from '@/lib/i18n/useTranslation';
import { haptics } from '@/utils/haptics';

// 1–10 scale card used for pain, stiffness, range of motion and activity
// (design: assets/possible-app-design/check in - evening). A big number with
// its word, a gradient track with a ring-bordered thumb, tick marks, and an
// optional "last time" dot on the track. Custom (not the native Slider)
// because the design needs all of that. A transparent child-less overlay is
// the touch responder, so `locationX` is relative to the whole track instead
// of whichever child was touched.

export type ScalePreset = 'pain' | 'stiffness' | 'rangeOfMotion' | 'activity' | 'sleep';

const MIN = 1;
const MAX = 10;
const THUMB = 34;
const R = THUMB / 2;
const MIDPOINT = 5;
const UNSET_COLOR = '#8A918C';

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// `count` colours evenly spread along the given stops (2+), e.g. a 3-stop
// green → cream → peach track.
function gradient(stops: string[], count = MAX): string[] {
  const rgb = stops.map(hexToRgb);
  return Array.from({ length: count }, (_, i) => {
    const position = (i / (count - 1)) * (rgb.length - 1);
    const from = Math.min(rgb.length - 2, Math.floor(position));
    const local = position - from;
    const channels = rgb[from].map((c, k) => Math.round(c + (rgb[from + 1][k] - c) * local));
    return `#${channels.map((c) => c.toString(16).padStart(2, '0')).join('')}`;
  });
}

interface PresetConfig {
  track: string[];
  level: string[];
  // Highest level of each of the five word buckets.
  wordLimits: [number, number, number, number, number];
  namespace: string;
}

// Warm = worse (pain, stiffness), green = better; range of motion and
// activity run the other way / are neutral green, so the colours match the
// meaning (higher range of motion is better).
const PRESETS: Record<ScalePreset, PresetConfig> = {
  pain: {
    track: gradient(['#FBEBD9', '#D97F5C']),
    level: gradient(['#C98A1B', '#5C2A18']),
    wordLimits: [2, 4, 6, 8, 10],
    namespace: 'checkin.scale.pain',
  },
  stiffness: {
    track: gradient(['#D3E3D7', '#F2E4CF', '#EDA37F']),
    level: gradient(['#2F5A41', '#7A5A22', '#8A4A2B']),
    wordLimits: [2, 5, 7, 9, 10],
    namespace: 'checkin.scale.stiffness',
  },
  rangeOfMotion: {
    track: gradient(['#EDA37F', '#F2E4CF', '#D3E3D7']),
    level: gradient(['#8A4A2B', '#7A5A22', '#2F5A41']),
    wordLimits: [2, 4, 6, 9, 10],
    namespace: 'checkin.scale.rangeOfMotion',
  },
  // Sleep quality: poor is warm, good is green (higher is better).
  sleep: {
    track: gradient(['#EDA37F', '#F2E4CF', '#D3E3D7']),
    level: gradient(['#8A4A2B', '#7A5A22', '#2F5A41']),
    wordLimits: [2, 4, 6, 8, 10],
    namespace: 'checkin.scale.sleep',
  },
  activity: {
    track: gradient(['#E3EDE5', '#A9C7B2']),
    level: gradient(['#2F5A41', '#2F5A41']),
    wordLimits: [2, 4, 6, 8, 10],
    namespace: 'checkin.scale.activity',
  },
};

export interface ScaleSliderCardProps {
  preset: ScalePreset;
  // null = not answered yet: the number shows "—" and the thumb rests, muted,
  // at the middle. The first touch commits a value — it is never saved as 5
  // by default.
  value: number | null;
  onChange: (value: number) => void;
  // Previous answer: drawn as a small ring on the track.
  previous?: number | null;
  // Text for the top-right, with a ring icon ("Praėjusį kartą: 5").
  hint?: string;
  // Plain top-right text without the ring ("iš 10").
  suffix?: string;
  accessibilityLabel: string;
}

export function ScaleSliderCard({
  preset,
  value,
  onChange,
  previous = null,
  hint,
  suffix,
  accessibilityLabel,
}: ScaleSliderCardProps) {
  const { t } = useTranslation();
  const config = PRESETS[preset];
  const [width, setWidth] = useState(0);
  const isUnset = value === null;
  const shown = Math.min(MAX, Math.max(MIN, value ?? MIDPOINT));
  const color = isUnset ? UNSET_COLOR : config.level[shown - 1];
  const span = Math.max(0, width - THUMB);
  const centerFor = (level: number) => R + ((level - MIN) / (MAX - MIN)) * span;
  const wordIndex = config.wordLimits.findIndex((limit) => shown <= limit);
  const previousLevel = previous == null ? null : Math.min(MAX, Math.max(MIN, previous));

  const commit = (next: number) => {
    // Unset: any touch commits, even on the resting midpoint.
    if (isUnset || next !== value) {
      haptics.tick();
      onChange(next);
    }
  };

  const setFromX = (x: number) => {
    if (span <= 0) return;
    const fraction = Math.min(1, Math.max(0, (x - R) / span));
    commit(Math.round(MIN + fraction * (MAX - MIN)));
  };

  const step = (delta: number) => commit(Math.min(MAX, Math.max(MIN, shown + delta)));

  return (
    <View className="gap-3 rounded-3xl bg-surface p-5 dark:bg-surfaceDark">
      <View className="flex-row items-end justify-between">
        <View className="flex-1 flex-row items-end gap-3">
          <Text className="text-[52px] font-bold leading-[60px]" style={{ color }}>
            {isUnset ? '—' : shown}
          </Text>
          {!isUnset && (
            <Text className="flex-1 pb-2 text-lg font-bold" style={{ color }} numberOfLines={1}>
              {t(`${config.namespace}.w${wordIndex + 1}`)}
            </Text>
          )}
        </View>
        {hint ? (
          <View className="flex-row items-center gap-1.5 pb-2">
            <View className="h-2.5 w-2.5 rounded-full border-2 border-inkSecondary bg-surface dark:bg-surfaceDark" />
            <Text className="text-[15px] text-inkSecondary dark:text-gray">{hint}</Text>
          </View>
        ) : suffix ? (
          <Text className="pb-2 text-[15px] text-inkSecondary dark:text-gray">{suffix}</Text>
        ) : null}
      </View>

      <View
        onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={accessibilityLabel}
        accessibilityValue={isUnset ? { text: t('common.notAnswered') } : { min: MIN, max: MAX, now: shown }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(event) => step(event.nativeEvent.actionName === 'increment' ? 1 : -1)}
        style={{ height: 44, justifyContent: 'center' }}
      >
        <View className="mx-[17px] h-3 flex-row overflow-hidden rounded-full">
          {config.track.map((segmentColor, index) => (
            <View key={index} className="flex-1" style={{ backgroundColor: segmentColor, opacity: isUnset ? 0.55 : 1 }} />
          ))}
        </View>
        {previousLevel !== null && width > 0 && (
          // Position is a runtime value NativeWind can't express.
          <View
            pointerEvents="none"
            className="absolute h-2.5 w-2.5 rounded-full border-2 border-inkSecondary bg-surface dark:bg-surfaceDark"
            style={{ left: centerFor(previousLevel) - 5 }}
          />
        )}
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
        {Array.from({ length: MAX - MIN + 1 }, (_, i) => MIN + i).map((level) => {
          const isCurrent = !isUnset && level === shown;
          return (
            <View
              key={level}
              className="w-[2px] rounded-full bg-borderLight dark:bg-borderDark"
              style={{
                height: isCurrent ? 12 : 8,
                backgroundColor: isCurrent ? color : undefined,
                alignSelf: 'flex-start',
              }}
            />
          );
        })}
      </View>

      <View className="flex-row justify-between">
        <Text className="text-sm text-inkSecondary dark:text-gray">{t(`${config.namespace}.min`)}</Text>
        <Text className="text-sm text-inkSecondary dark:text-gray">{t(`${config.namespace}.max`)}</Text>
      </View>
    </View>
  );
}
