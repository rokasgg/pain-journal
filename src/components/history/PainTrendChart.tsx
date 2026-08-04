import { Circle, matchFont } from '@shopify/react-native-skia';
import { format, parseISO } from 'date-fns';
import { useMemo } from 'react';
import { Platform, Text, useColorScheme, View } from 'react-native';
import { CartesianChart, Line } from 'victory-native';

import { useTranslation } from '@/lib/i18n/useTranslation';
import { colors } from '@/lib/theme';
import type { Checkin } from '@/types/database.types';

export interface PainTrendChartProps {
  checkins: Checkin[];
  className?: string;
}

interface ChartPoint extends Record<string, unknown> {
  index: number;
  pain: number;
  date: string;
}

const font = matchFont({
  fontFamily: Platform.select({ ios: 'Helvetica', default: 'sans-serif' }),
  fontSize: 11,
});

export function PainTrendChart({ checkins }: PainTrendChartProps) {
  const { t } = useTranslation();
  const isDark = useColorScheme() === 'dark';
  const lineColor = isDark ? colors.white : colors.black;
  const gridColor = isDark ? colors.borderDark : colors.borderLight;
  const labelColor = colors.gray;

  const data: ChartPoint[] = useMemo(() => {
    // One point per day — average morning/evening together — so dots and the
    // line correspond to the day labels on the x-axis instead of doubling up.
    const byDate = new Map<string, number[]>();
    for (const checkin of checkins) {
      const levels = byDate.get(checkin.checkin_date) ?? [];
      levels.push(checkin.pain_level);
      byDate.set(checkin.checkin_date, levels);
    }

    return [...byDate.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, levels], index) => ({
        index,
        pain: levels.reduce((sum, level) => sum + level, 0) / levels.length,
        date,
      }));
  }, [checkins]);

  if (data.length < 2) {
    return null;
  }

  return (
    <View className="gap-3 rounded-2xl bg-surface p-4 dark:bg-surfaceDark">
      <View>
        <Text className="text-base font-semibold text-black dark:text-white">{t('detail.painIntensityChartTitle')}</Text>
        <Text className="text-sm text-gray-500 dark:text-gray-400">{t('detail.painIntensityChartSubtitle')}</Text>
      </View>

      <View className="h-52 w-full">
        <CartesianChart
          data={data}
          xKey="index"
          yKeys={['pain']}
          domain={{ y: [0, 10] }}
          domainPadding={{ left: 12, right: 12, top: 12, bottom: 12 }}
          axisOptions={{
            font,
            tickCount: { x: Math.min(5, data.length), y: 6 },
            lineColor: gridColor,
            labelColor,
            formatYLabel: (label) => String(Math.round(label)),
            formatXLabel: (label) => {
              const point = data[Math.round(label)];
              return point ? format(parseISO(point.date), 'MMM d') : '';
            },
          }}
        >
          {({ points }) => (
            <>
              <Line points={points.pain} color={lineColor} strokeWidth={2} curveType="linear" />
              {points.pain.map(
                (point, index) =>
                  point.y != null && <Circle key={index} cx={point.x} cy={point.y} r={4} color={lineColor} />,
              )}
            </>
          )}
        </CartesianChart>
      </View>
    </View>
  );
}
