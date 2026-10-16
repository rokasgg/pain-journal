import { Ionicons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import { Link, type Href } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { useAvailableWraps } from '@/hooks/useMonthlyWrap';
import { currentDateFnsLocale, todayLocalDate } from '@/lib/dates';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { colors } from '@/lib/theme';
import { recentCompletedMonths } from '@/lib/wrap';
import { useWrapStore } from '@/store/useWrapStore';

// Shown only until last month's Wrap has been opened once — after that it's
// reachable from History's "Monthly Wraps" row, so Home never stays cluttered.
export function WrapReadyCard() {
  const { t } = useTranslation();
  const availableWraps = useAvailableWraps();
  const seenMonths = useWrapStore((s) => s.seenMonths);

  const lastMonth = recentCompletedMonths(todayLocalDate(), 1)[0];
  if (!availableWraps.includes(lastMonth) || seenMonths.includes(lastMonth)) return null;

  // 'MMMM' is the formatting (genitive) form — reads correctly in Lithuanian
  // ("spalio apžvalga"), unlike the standalone 'LLLL'.
  const monthLabel = format(parseISO(`${lastMonth}-01`), 'MMMM', { locale: currentDateFnsLocale() });

  return (
    <Link href={`/wrap/${lastMonth}` as Href} asChild>
      <Pressable className="flex-row items-center gap-4 rounded-2xl bg-primary p-4 active:opacity-90 dark:bg-primaryDark">
        <View className="h-12 w-12 items-center justify-center rounded-full bg-white/20">
          <Ionicons name="sparkles" size={24} color={colors.white} />
        </View>
        <View className="flex-1 gap-0.5">
          <Text className="text-base font-semibold text-white">{t('wrap.readyTitle', { month: monthLabel })}</Text>
          <Text className="text-sm text-white/80">{t('wrap.readySubtitle')}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.white} />
      </Pressable>
    </Link>
  );
}
