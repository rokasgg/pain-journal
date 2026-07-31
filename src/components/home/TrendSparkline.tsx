import { useMemo } from 'react';
import { useColorScheme, View } from 'react-native';
import { CartesianChart, Line } from 'victory-native';

import { useCheckinHistory } from '@/hooks/useCheckins';
import { colors } from '@/lib/theme';

interface SparklinePoint extends Record<string, unknown> {
  index: number;
  pain: number;
}

export function TrendSparkline() {
  const isDark = useColorScheme() === 'dark';
  const { checkins } = useCheckinHistory(7);

  const data: SparklinePoint[] = useMemo(
    () =>
      [...checkins]
        .sort((a, b) => a.checkin_date.localeCompare(b.checkin_date))
        .map((checkin, index) => ({ index, pain: checkin.pain_level })),
    [checkins],
  );

  if (data.length < 2) return null;

  return (
    <View className="h-16 w-full">
      <CartesianChart data={data} xKey="index" yKeys={['pain']} domain={{ y: [0, 10] }}>
        {({ points }) => (
          <Line
            points={points.pain}
            color={isDark ? colors.white : colors.black}
            strokeWidth={2}
            curveType="natural"
          />
        )}
      </CartesianChart>
    </View>
  );
}
