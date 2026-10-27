import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { useTranslation } from '@/lib/i18n/useTranslation';
import { colors } from '@/lib/theme';

const QUESTION_KEYS = ['insights.askChip1', 'insights.askChip2', 'insights.askChip3'] as const;

// Insights → "Ask AI about your data": a calm white card (it used to be a
// second solid green slab competing with the real primary actions). The
// pretend field opens the chat; each example chip opens it with that
// question already sent (insights/chat?q=…).
export function AskAiCard() {
  const { t } = useTranslation();

  return (
    <View className="gap-3 rounded-[18px] bg-surface p-4 dark:bg-surfaceDark">
      <View className="flex-row items-center gap-2">
        <Ionicons name="sparkles-outline" size={18} color={colors.accent} />
        <Text className="text-[17px] font-bold text-ink dark:text-white">{t('insights.askTitle')}</Text>
      </View>

      <Link href="/insights/chat" asChild>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('insights.askPlaceholder')}
          className="h-12 flex-row items-center justify-between rounded-xl bg-segmentTrack pl-4 pr-1.5 active:opacity-70 dark:bg-segmentTrackDark"
        >
          <Text className="text-[15px] text-inkSecondary dark:text-gray">{t('insights.askPlaceholder')}</Text>
          <View className="h-9 w-9 items-center justify-center rounded-full bg-accent dark:bg-primaryDark">
            <Ionicons name="arrow-up" size={18} color={colors.white} />
          </View>
        </Pressable>
      </Link>

      <View className="items-start gap-2">
        {QUESTION_KEYS.map((key) => (
          <Link key={key} href={{ pathname: '/insights/chat', params: { q: t(key) } }} asChild>
            <Pressable
              accessibilityRole="button"
              className="rounded-full bg-accentMuted px-3.5 py-2 active:opacity-70 dark:bg-segmentTrackDark"
            >
              <Text className="text-[14px] text-ink dark:text-white">{t(key)}</Text>
            </Pressable>
          </Link>
        ))}
      </View>
    </View>
  );
}
