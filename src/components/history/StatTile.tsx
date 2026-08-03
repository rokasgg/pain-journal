import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';

export interface StatTileProps {
  label: string;
  value: string;
  trend?: { direction: 'up' | 'down'; label: string; isGood?: boolean };
  className?: string;
}

export function StatTile({ label, value, trend, className }: StatTileProps) {
  const trendColor = trend
    ? trend.isGood
      ? 'text-primary dark:text-primaryDark'
      : 'text-red-600 dark:text-red-500'
    : '';

  return (
    <View className={`flex-1 gap-1 rounded-2xl bg-surface p-4 dark:bg-surfaceDark ${className ?? ''}`}>
      <Text className="text-xs text-gray-500 dark:text-gray-400">{label}</Text>
      <View className="flex-row items-center gap-2">
        <Text className="text-3xl font-bold text-black dark:text-white">{value}</Text>
        {trend && (
          <View className="flex-row items-center gap-0.5">
            <Ionicons
              name={trend.direction === 'up' ? 'arrow-up' : 'arrow-down'}
              size={12}
              color={trend.isGood ? '#3B6247' : '#dc2626'}
            />
            <Text className={`text-xs font-medium ${trendColor}`}>{trend.label}</Text>
          </View>
        )}
      </View>
    </View>
  );
}
