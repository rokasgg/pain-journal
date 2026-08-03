import { useMemo } from 'react';
import { Text, useColorScheme, View } from 'react-native';
import { Area, CartesianChart, Line } from 'victory-native';

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

  const changePercent = useMemo(() => {
    if (data.length < 2) return null;
    const first = data[0].pain;
    const last = data[data.length - 1].pain;
    if (first === 0) return null;
    return Math.round(((last - first) / first) * 100);
  }, [data]);

  const lineColor = isDark ? colors.primaryDark : colors.primary;

  return (
    <View className="gap-3 rounded-2xl bg-surface p-4 dark:bg-surfaceDark">
      <View className="flex-row items-center justify-between">
        <View>
          <Text className="text-base font-semibold text-black dark:text-white">Pain Trend</Text>
          <Text className="text-sm text-gray-500 dark:text-gray-400">Last 7 days</Text>
        </View>
        {changePercent !== null && (
          <Text
            className={`text-sm font-semibold ${
              changePercent <= 0 ? 'text-primary dark:text-primaryDark' : 'text-red-600 dark:text-red-500'
            }`}
          >
            {changePercent > 0 ? '+' : ''}
            {changePercent}%
          </Text>
        )}
      </View>

      {data.length < 2 ? (
        <Text className="py-4 text-sm text-gray-500 dark:text-gray-400">
          Log a few check-ins to see your trend here.
        </Text>
      ) : (
        <View className="h-32 w-full">
          <CartesianChart data={data} xKey="index" yKeys={['pain']} domain={{ y: [0, 10] }}>
            {({ points, chartBounds }) => (
              <>
                <Area
                  points={points.pain}
                  y0={chartBounds.bottom}
                  color={lineColor}
                  opacity={0.15}
                  curveType="natural"
                />
                <Line points={points.pain} color={lineColor} strokeWidth={2} curveType="natural" />
              </>
            )}
          </CartesianChart>
        </View>
      )}
    </View>
  );
}
