import { Circle, Group, LinearGradient, Line as SkiaLine, matchFont, vec } from '@shopify/react-native-skia';
import { format, parseISO } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform, Text, useColorScheme, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedReaction,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import {
  Area,
  CartesianChart,
  Line,
  useChartPressState,
  type ChartPressState,
  type PointsArray,
} from 'victory-native';
import { scheduleOnRN } from 'react-native-worklets';

import { capitalize, currentDateFnsLocale, todayLocalDate } from '@/lib/dates';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { buildPainTrend, formatBucketDate, type TrendGranularity, type TrendRange } from '@/lib/painTrend';
import { colors } from '@/lib/theme';
import type { Checkin } from '@/types/database.types';

export interface PainTrendChartProps {
  // Full history — the chart filters and buckets it for `range` itself, so
  // switching ranges never refetches or unmounts the chart (which is what
  // used to make it flicker).
  checkins: Checkin[];
  range: TrendRange;
  className?: string;
}

type PressState = ChartPressState<{ x: number; y: { pain: number } }>;

const font = matchFont({
  fontFamily: Platform.select({ ios: 'Helvetica', default: 'sans-serif' }),
  fontSize: 11,
});

const PATH_ANIMATION = { type: 'timing', duration: 350 } as const;
const READOUT_FADE_MS = 120;
// Press-and-hold before scrubbing kicks in, so a plain vertical swipe over
// the chart still scrolls the History screen.
const SCRUB_LONG_PRESS_MS = 150;
const MAX_X_LABELS: Record<TrendRange, number> = { week: 7, month: 5, all: 5 };
const X_LABEL_WIDTH = 48;
const LABEL_FORMATS: Record<TrendGranularity, string> = { day: 'MMM d', week: 'MMM d', month: 'MMM' };

// Evenly spaced indices across `count` points, always including first and last.
function labelIndices(count: number, max: number): number[] {
  if (count <= max) return Array.from({ length: count }, (_, i) => i);
  return Array.from({ length: max }, (_, i) => Math.round((i * (count - 1)) / (max - 1)));
}

function formatPain(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

interface FadingDotsProps {
  points: PointsArray;
  showAll: boolean;
  color: string;
  ringColor: string;
}

// Mounted fresh per range (via `key`) and faded in once the line morph has
// mostly finished, so dots never pop in at positions the line hasn't reached.
function FadingDots({ points, showAll, color, ringColor }: FadingDotsProps) {
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withDelay(PATH_ANIMATION.duration - 100, withTiming(1, { duration: 200 }));
  }, [opacity]);

  const visible = points.filter((point) => point.y != null);
  const last = visible[visible.length - 1];

  return (
    <Group opacity={opacity}>
      {showAll &&
        visible.map((point) => <Circle key={point.xValue as number} cx={point.x} cy={point.y as number} r={3.5} color={color} />)}
      {last && (
        <>
          <Circle cx={last.x} cy={last.y as number} r={7} color={ringColor} />
          <Circle cx={last.x} cy={last.y as number} r={4.5} color={color} />
        </>
      )}
    </Group>
  );
}

interface ScrubIndicatorProps {
  state: PressState;
  top: number;
  bottom: number;
  showDot: boolean;
  color: string;
  ringColor: string;
}

// Vertical guide line + focus dot, driven straight off victory-native's
// press-state shared values so it tracks the finger on the UI thread.
function ScrubIndicator({ state, top, bottom, showDot, color, ringColor }: ScrubIndicatorProps) {
  const lineStart = useDerivedValue(() => vec(state.x.position.value, top));
  const lineEnd = useDerivedValue(() => vec(state.x.position.value, bottom));

  return (
    <>
      <SkiaLine p1={lineStart} p2={lineEnd} color={colors.gray} opacity={0.6} strokeWidth={1} />
      {showDot && (
        <>
          <Circle cx={state.x.position} cy={state.y.pain.position} r={7} color={ringColor} />
          <Circle cx={state.x.position} cy={state.y.pain.position} r={4.5} color={color} />
        </>
      )}
    </>
  );
}

export function PainTrendChart({ checkins, range, className }: PainTrendChartProps) {
  const { t, locale } = useTranslation();
  const isDark = useColorScheme() === 'dark';
  const lineColor = isDark ? colors.primaryDark : colors.primary;
  const ringColor = isDark ? colors.surfaceDark : colors.surface;
  const gridColor = isDark ? colors.borderDark : colors.borderLight;
  const [xScale, setXScale] = useState<((value: number) => number) | null>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const { state: pressState, isActive: isScrubbing } = useChartPressState({ x: 0, y: { pain: 0 } });

  const { points, granularity } = useMemo(() => buildPainTrend(checkins, range, todayLocalDate()), [checkins, range]);
  const hasEnoughData = points.filter((point) => point.pain !== null).length >= 2;
  const activePoint = activeIndex !== null ? points[activeIndex] : undefined;

  const handleScrub = useCallback((index: number) => {
    if (index < 0) {
      setActiveIndex(null);
      return;
    }
    setActiveIndex(index);
    Haptics.selectionAsync().catch(() => {});
  }, []);

  // Only crosses to JS when the snapped bucket changes (or on release), not
  // on every finger move — keeps the readout + haptic tick to one per bucket.
  useAnimatedReaction(
    () => (pressState.isActive.value ? pressState.matchedIndex.value : -1),
    (index, previous) => {
      if (index !== previous) scheduleOnRN(handleScrub, index);
    },
  );

  const xLabelsStyle = useAnimatedStyle(() => ({
    opacity: withTiming(pressState.isActive.value ? 0.3 : 1, { duration: 150 }),
  }));

  const xLabels = useMemo(() => {
    const dateLocale = currentDateFnsLocale();
    const labelFormat = range === 'week' ? 'EEE' : LABEL_FORMATS[granularity];
    return labelIndices(points.length, MAX_X_LABELS[range]).map((index) => ({
      index,
      text: capitalize(format(parseISO(points[index].date), labelFormat, { locale: dateLocale })),
    }));
    // `locale` re-runs this when the language changes (currentDateFnsLocale is non-reactive).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points, range, granularity, locale]);

  const readoutDate = activePoint
    ? granularity === 'week'
      ? t('detail.trendWeekOf', { date: formatBucketDate(activePoint.date, granularity, currentDateFnsLocale()) })
      : formatBucketDate(activePoint.date, granularity, currentDateFnsLocale())
    : null;

  return (
    <View className={`gap-3 rounded-2xl bg-surface p-4 dark:bg-surfaceDark ${className ?? ''}`}>
      {/* Readout lives in the header, not next to the touch point — the thumb
          covers everything at/below where it presses. Fixed height so the
          chart never shifts when the readout appears. */}
      <View className="h-12 flex-row justify-between">
        <View className="flex-1">
          <Text className="text-base font-semibold text-black dark:text-white">{t('detail.painIntensityChartTitle')}</Text>
          <View className="h-5">
            {readoutDate ? (
              <Animated.View
                key="readout-date"
                entering={FadeIn.duration(READOUT_FADE_MS)}
                exiting={FadeOut.duration(READOUT_FADE_MS)}
                className="absolute inset-0"
              >
                <Text className="text-sm font-medium text-black dark:text-white">
                  {activePoint?.pain === null ? `${readoutDate} · ${t('detail.trendNoCheckin')}` : readoutDate}
                </Text>
              </Animated.View>
            ) : (
              <Animated.View
                key="subtitle"
                entering={FadeIn.duration(READOUT_FADE_MS)}
                exiting={FadeOut.duration(READOUT_FADE_MS)}
                className="absolute inset-0"
              >
                <Text className="text-sm text-gray-500 dark:text-gray">{t('detail.painIntensityChartSubtitle')}</Text>
              </Animated.View>
            )}
          </View>
        </View>

        {activePoint && (
          <Animated.View
            entering={FadeIn.duration(READOUT_FADE_MS)}
            exiting={FadeOut.duration(READOUT_FADE_MS)}
            className="flex-row items-baseline gap-1"
          >
            {granularity !== 'day' && activePoint.pain !== null && (
              <Text className="text-xs text-gray-500 dark:text-gray">{t('detail.trendAvg')}</Text>
            )}
            <Text className="text-3xl font-bold text-primary dark:text-primaryDark">
              {activePoint.pain !== null ? formatPain(activePoint.pain) : '—'}
            </Text>
            <Text className="text-sm text-gray-500 dark:text-gray">/10</Text>
          </Animated.View>
        )}
      </View>

      {/* Fixed height whether or not there's data, so the card never jumps. */}
      <View className="h-56 w-full">
        {hasEnoughData ? (
          <Animated.View entering={FadeIn.duration(250)} exiting={FadeOut.duration(150)} className="flex-1">
            <View className="flex-1">
              <CartesianChart
                data={points}
                xKey="x"
                yKeys={['pain']}
                domain={{ x: [0, Math.max(points.length - 1, 1)], y: [0, 10] }}
                domainPadding={{ left: 10, right: 10, top: 10, bottom: 4 }}
                chartPressState={pressState}
                gestureLongPressDelay={SCRUB_LONG_PRESS_MS}
                onScaleChange={(scale) => setXScale(() => (value: number) => scale(value))}
                frame={{ lineWidth: 0 }}
                xAxis={{ font: null, lineWidth: 0 }}
                yAxis={[
                  {
                    font,
                    tickValues: [0, 5, 10],
                    lineColor: gridColor,
                    labelColor: colors.gray,
                    formatYLabel: (label) => String(Math.round(label ?? 0)),
                  },
                ]}
              >
                {({ points: chartPoints, chartBounds }) => (
                  <>
                    <Area
                      points={chartPoints.pain}
                      y0={chartBounds.bottom}
                      curveType="monotoneX"
                      connectMissingData
                      animate={PATH_ANIMATION}
                    >
                      <LinearGradient
                        start={vec(0, chartBounds.top)}
                        end={vec(0, chartBounds.bottom)}
                        colors={[`${lineColor}55`, `${lineColor}00`]}
                      />
                    </Area>
                    <Line
                      points={chartPoints.pain}
                      color={lineColor}
                      strokeWidth={2.5}
                      curveType="monotoneX"
                      connectMissingData
                      animate={PATH_ANIMATION}
                    />
                    <Group opacity={isScrubbing ? 0.4 : 1}>
                      <FadingDots
                        key={range}
                        points={chartPoints.pain}
                        showAll={range === 'week'}
                        color={lineColor}
                        ringColor={ringColor}
                      />
                    </Group>
                    {isScrubbing && (
                      <ScrubIndicator
                        state={pressState}
                        top={chartBounds.top}
                        bottom={chartBounds.bottom}
                        showDot={activePoint?.pain != null}
                        color={lineColor}
                        ringColor={ringColor}
                      />
                    )}
                  </>
                )}
              </CartesianChart>
            </View>

            <Animated.View style={xLabelsStyle} className="h-5">
              <Animated.View key={range} entering={FadeIn.duration(250)} className="flex-1">
                {xScale &&
                  xLabels.map(({ index, text }) => (
                    <Text
                      key={index}
                      numberOfLines={1}
                      className="absolute text-center text-[11px] text-gray-500 dark:text-gray"
                      style={{ left: xScale(index) - X_LABEL_WIDTH / 2, width: X_LABEL_WIDTH }}
                    >
                      {text}
                    </Text>
                  ))}
              </Animated.View>
            </Animated.View>
          </Animated.View>
        ) : (
          <Animated.View
            entering={FadeIn.duration(250)}
            exiting={FadeOut.duration(150)}
            className="flex-1 items-center justify-center"
          >
            <Text className="text-center text-sm text-gray-500 dark:text-gray">{t('detail.painIntensityChartEmpty')}</Text>
          </Animated.View>
        )}
      </View>
    </View>
  );
}
