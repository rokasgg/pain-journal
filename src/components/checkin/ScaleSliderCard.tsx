import { useEffect, useMemo, useRef, useState } from 'react';
import { Text, View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import { InfoButton } from '@/components/ui/InfoButton';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { haptics } from '@/utils/haptics';

// The one 1–10 rating slider: Log Flare-up (pain), the check-ins (pain,
// stiffness, range of motion, activity, sleep quality). Compact layout — a title
// row (the question on the left, the readout "5 · noticeable" on the right with
// "Last time: 6" under it) and a card holding the gradient track with the two
// end labels underneath, at the edges. Custom (not the native Slider) because the design needs the
// ring-bordered thumb and the gradient. Touch is handled by react-native-gesture-handler
// (not RN's JS responder): a pan that activates on horizontal movement and fails on
// vertical movement, so dragging the slider never scrolls the form or drags a modal
// sheet, while a mostly-vertical swipe over it still scrolls as usual. A separate tap
// gesture handles a plain press. `x` is relative to the strip the detector wraps.

export type ScalePreset = 'pain' | 'stiffness' | 'rangeOfMotion' | 'activity' | 'sleep';

const MIN = 1;
const MAX = 10;
const THUMB = 32;
const R = THUMB / 2;
// Where the thumb rests, muted, while nothing is answered yet.
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
  // The question, shown in the title row ("How strong is the pain?").
  title: string;
  // Optional (i) popover next to the title.
  info?: string;
  // null = not answered yet: the title row shows "Choose" and the thumb is
  // hidden until the first touch, which places it where the finger lands. It
  // is never saved as a default.
  value: number | null;
  onChange: (value: number) => void;
  // Previous answer: drawn as a small ring on the track.
  previous?: number | null;
  // "Last time: 6" under the value (already localised by the caller). Hidden
  // when there is no previous answer.
  hint?: string;
}

// Pan = drag (activates on horizontal movement, fails on vertical so scrolling and
// sheet-dismiss still work); Tap = a plain press. The latest handler is read through
// a ref inside the callbacks, so the gesture objects stay stable across renders.
function createSliderGesture(handlerRef: { current: (x: number) => void }) {
  const pan = Gesture.Pan()
    .runOnJS(true)
    .activeOffsetX([-6, 6])
    .failOffsetY([-12, 12])
    .onUpdate((event) => handlerRef.current(event.x));
  const tap = Gesture.Tap()
    .runOnJS(true)
    .maxDistance(10)
    .onEnd((event, success) => {
      if (success) handlerRef.current(event.x);
    });
  return Gesture.Race(pan, tap);
}

function useSliderGesture(onX: (x: number) => void) {
  const handlerRef = useRef(onX);
  useEffect(() => {
    handlerRef.current = onX;
  });
  // The ref is only read inside the gesture callbacks (touch events), never during render.
  // eslint-disable-next-line react-hooks/refs
  return useMemo(() => createSliderGesture(handlerRef), []);
}

export function ScaleSliderCard({ preset, title, info, value, onChange, previous = null, hint }: ScaleSliderCardProps) {
  const { t } = useTranslation();
  const config = PRESETS[preset];
  const [width, setWidth] = useState(0);
  const isUnset = value === null;
  const shown = Math.min(MAX, Math.max(MIN, value ?? MIDPOINT));
  const color = isUnset ? UNSET_COLOR : config.level[shown - 1];
  const word = t(`${config.namespace}.w${config.wordLimits.findIndex((limit) => shown <= limit) + 1}`);
  const span = Math.max(0, width - THUMB);
  const centerFor = (level: number) => R + ((level - MIN) / (MAX - MIN)) * span;
  const previousLevel = previous == null ? null : Math.min(MAX, Math.max(MIN, previous));

  // Several move events can arrive before React re-renders, so the last value
  // that was committed lives in a ref — haptics fire only when the rounded
  // value actually changes.
  const lastRef = useRef<number | null>(value);
  useEffect(() => {
    lastRef.current = value;
  }, [value]);

  const commit = (next: number) => {
    if (next === lastRef.current) return;
    lastRef.current = next;
    haptics.tick();
    onChange(next);
  };

  const setFromX = (x: number) => {
    if (span <= 0) return;
    const fraction = Math.min(1, Math.max(0, (x - R) / span));
    commit(Math.round(MIN + fraction * (MAX - MIN)));
  };

  const gesture = useSliderGesture(setFromX);

  const step = (delta: number) => commit(Math.min(MAX, Math.max(MIN, (value ?? MIN - delta) + delta)));

  return (
    <View className="gap-2">
      <View className="flex-row flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <View className="flex-shrink flex-row items-baseline gap-2">
          <Text className="flex-shrink text-heading text-ink dark:text-white">{title}</Text>
          {info && <InfoButton title={title} message={info} />}
        </View>
        <View className="ml-auto items-end">
          {isUnset ? (
            <Text className="text-body text-inkSecondary dark:text-gray">{t('checkin.choose')}</Text>
          ) : (
            <Text className="text-nav" style={{ color, fontVariant: ['tabular-nums'] }}>
              {`${shown} · ${word}`}
            </Text>
          )}
          {hint && previousLevel !== null && (
            <Text className="text-caption text-inkSecondary dark:text-gray">{hint}</Text>
          )}
        </View>
      </View>

      <View className="gap-1.5 rounded-2xl bg-surface px-3 py-2.5 dark:bg-surfaceDark">
        <GestureDetector gesture={gesture}>
          <View
            onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)}
            accessible
            accessibilityRole="adjustable"
            accessibilityLabel={title}
            accessibilityValue={
              isUnset
                ? { min: MIN, max: MAX, text: t('common.notAnswered') }
                : { min: MIN, max: MAX, now: shown, text: `${shown}, ${word}` }
            }
            accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
            onAccessibilityAction={(event) => step(event.nativeEvent.actionName === 'increment' ? 1 : -1)}
            // 44pt tall: the whole strip is the touch target, the track itself is 12pt.
            style={{ height: 44, justifyContent: 'center' }}
          >
            <View className="mx-4 h-3 flex-row overflow-hidden rounded-full">
              {config.track.map((segmentColor, index) => (
                <View
                  key={index}
                  className="flex-1"
                  style={{
                    backgroundColor: segmentColor,
                    opacity: isUnset ? 0.55 : 1,
                  }}
                />
              ))}
            </View>
            {previousLevel !== null && width > 0 && (
              // Position is a runtime value NativeWind can't express.
              <View
                pointerEvents="none"
                className="absolute h-2 w-2 rounded-full border-2 border-inkSecondary bg-surface dark:bg-surfaceDark"
                style={{ left: centerFor(previousLevel) - 4 }}
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
          </View>
        </GestureDetector>

        <View className="flex-row justify-between">
          <Text className="text-caption text-inkSecondary dark:text-gray">{t(`${config.namespace}.min`)}</Text>
          <Text className="text-caption text-inkSecondary dark:text-gray">{t(`${config.namespace}.max`)}</Text>
        </View>
      </View>
    </View>
  );
}
