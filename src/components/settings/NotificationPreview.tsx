import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';

import { colors } from '@/lib/theme';

export interface NotificationPreviewProps {
  appName: string;
  time: string; // "HH:mm"
  title: string;
  body: string;
  dimmed?: boolean;
}

// A mock lock-screen notification (design from
// assets/possible-app-design/notifications). Callers pass the *real*
// notifications.* copy, so what's previewed is what actually arrives.
export function NotificationPreview({ appName, time, title, body, dimmed = false }: NotificationPreviewProps) {
  return (
    <View
      className="flex-row gap-3 rounded-3xl border border-borderLight bg-surface p-4 dark:border-borderDark dark:bg-surfaceDark"
      // Opacity via style, not a toggled class (NativeWind upgrade gotcha).
      style={dimmed ? { opacity: 0.45 } : undefined}
    >
      <View className="h-11 w-11 items-center justify-center rounded-xl bg-primary dark:bg-primaryDark">
        <Ionicons name="leaf-outline" size={22} color={colors.white} />
      </View>
      <View className="flex-1 gap-0.5">
        <View className="flex-row items-center justify-between">
          <Text className="text-sm font-semibold text-black dark:text-white">{appName}</Text>
          <Text className="text-sm text-gray">{time}</Text>
        </View>
        <Text className="text-base font-bold text-black dark:text-white">{title}</Text>
        <Text className="text-base text-strongGray dark:text-white/80">{body}</Text>
      </View>
    </View>
  );
}
