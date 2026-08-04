import { matchFont } from '@shopify/react-native-skia';
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

  const data: ChartPoint[] = useMemo(
    () =>
      [...checkins]
        .sort((a, b) => a.checkin_date.localeCompare(b.checkin_date))
        .map((checkin, index) => ({ index, pain: checkin.pain_level, date: checkin.checkin_date })),
    [checkins],
  );

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
            <Line points={points.pain} color={lineColor} strokeWidth={2} curveType="natural" />
          )}
        </CartesianChart>
      </View>
    </View>
  );
}
