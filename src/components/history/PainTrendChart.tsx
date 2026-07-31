import { useMemo } from 'react';
import { useColorScheme, View } from 'react-native';
import { CartesianChart, Line } from 'victory-native';

import { colors } from '@/lib/theme';
import type { Checkin } from '@/types/database.types';

export interface PainTrendChartProps {
  checkins: Checkin[];
  className?: string;
}

interface ChartPoint extends Record<string, unknown> {
  index: number;
  pain: number;
}

export function PainTrendChart({ checkins }: PainTrendChartProps) {
  const isDark = useColorScheme() === 'dark';
  const lineColor = isDark ? colors.white : colors.black;

  const data: ChartPoint[] = useMemo(
    () =>
      [...checkins]
        .sort((a, b) => a.checkin_date.localeCompare(b.checkin_date))
        .map((checkin, index) => ({ index, pain: checkin.pain_level })),
    [checkins],
  );

  if (data.length < 2) {
    return null;
  }

  return (
    <View className="h-52 w-full">
      <CartesianChart data={data} xKey="index" yKeys={['pain']} domain={{ y: [0, 10] }}>
        {({ points }) => <Line points={points.pain} color={lineColor} strokeWidth={2} curveType="natural" />}
      </CartesianChart>
    </View>
  );
}
