import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { useTodayStatus } from '@/hooks/useTodayStatus';
import { colors } from '@/lib/theme';

function StatusRow({ label, done, href }: { label: string; done: boolean; href: '/checkin/morning' | '/checkin/evening' }) {
  return (
    <View className="flex-row items-center justify-between py-3">
      <View className="flex-row items-center gap-3">
        <Ionicons
          name={done ? 'checkmark-circle' : 'ellipse-outline'}
          size={22}
          color={done ? '#16a34a' : colors.gray}
        />
        <Text className="text-base text-black dark:text-white">{label}</Text>
      </View>

      {!done && (
        <Link href={href} asChild>
          <Pressable className="rounded-full bg-black px-3 py-1.5 dark:bg-white">
            <Text className="text-sm font-semibold text-white dark:text-black">Log now</Text>
          </Pressable>
        </Link>
      )}
    </View>
  );
}

export function CheckinStatusCard() {
  const { morningDone, eveningDone } = useTodayStatus();

  return (
    <View className="gap-1 rounded-lg border border-gray-200 px-4 dark:border-gray-800">
      <StatusRow label="Morning check-in" done={morningDone} href="/checkin/morning" />
      <View className="h-px bg-gray-200 dark:bg-gray-800" />
      <StatusRow label="Evening check-in" done={eveningDone} href="/checkin/evening" />
    </View>
  );
}
