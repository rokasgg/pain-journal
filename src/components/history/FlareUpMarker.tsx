import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';

export interface FlareUpMarkerProps {
  painLevel: number;
  compact?: boolean;
  className?: string;
}

export function FlareUpMarker({ painLevel, compact, className }: FlareUpMarkerProps) {
  if (compact) {
    return (
      <View className={`h-2.5 w-2.5 rounded-full bg-red-600 dark:bg-red-500 ${className ?? ''}`} />
    );
  }

  return (
    <View
      className={`flex-row items-center gap-1 self-start rounded-full bg-red-100 px-2 py-1 dark:bg-red-950 ${className ?? ''}`}
    >
      <Ionicons name="flame" size={12} color="#dc2626" />
      <Text className="text-xs font-semibold text-red-700 dark:text-red-400">Flare-up · {painLevel}</Text>
    </View>
  );
}
