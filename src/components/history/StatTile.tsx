import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';

import { colors } from '@/lib/theme';

export interface StatTileProps {
  label: string;
  value: string;
  trend?: { direction: 'up' | 'down'; label: string; isGood?: boolean };
  className?: string;
}

const TREND_ICON_RED = '#dc2626'; // matches text-red-600

export function StatTile({ label, value, trend, className }: StatTileProps) {
  const trendColor = trend
    ? trend.isGood
      ? 'text-primary dark:text-primaryDark'
      : 'text-red-600 dark:text-red-500'
    : '';

  return (
    <View className={`flex-1 gap-1 rounded-2xl bg-surface p-3 dark:bg-surfaceDark ${className ?? ''}`}>
      <Text numberOfLines={1} className="text-xs text-gray-500 dark:text-gray">
        {label}
      </Text>
      <Text className="text-2xl font-bold text-black dark:text-white">{value}</Text>
      {/* Own line under the value so it fits when three tiles share a row. */}
      {trend && (
        <View className="flex-row items-center gap-0.5">
          <Ionicons
            name={trend.direction === 'up' ? 'arrow-up' : 'arrow-down'}
            size={11}
            color={trend.isGood ? colors.primary : TREND_ICON_RED}
          />
          <Text numberOfLines={1} className={`flex-shrink text-[11px] font-medium ${trendColor}`}>
            {trend.label}
          </Text>
        </View>
      )}
    </View>
  );
}
