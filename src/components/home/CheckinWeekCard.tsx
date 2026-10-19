import { useMemo } from 'react';
import { Text, View } from 'react-native';

import { useCheckinHistory } from '@/hooks/useCheckins';
import { buildCheckinWeek } from '@/lib/checkinWeek';
import { todayLocalDate, WEEKDAY_LABELS_BY_LOCALE } from '@/lib/dates';
import { useTranslation } from '@/lib/i18n/useTranslation';

const MORNING_LEGEND = '#b45309';
const EVENING_LEGEND = '#4f46e5';

// One check-in slot. Every visual state is a layer that's always rendered and
// shown via `style.opacity` — logging a check-in must not swap classes on a
// mounted element (NativeWind upgrade gotcha, CLAUDE.md).
function Dot({ logged, pendingToday }: { logged: boolean; pendingToday: boolean }) {
  return (
    <View className="h-5 w-5">
      <View
        className="absolute inset-0 rounded-full bg-borderLight dark:bg-borderDark"
        style={{ opacity: logged || pendingToday ? 0 : 1 }}
      />
      <View
        className="absolute inset-0 rounded-full border-2 border-dashed border-primary dark:border-primaryDark"
        style={{ opacity: pendingToday ? 1 : 0 }}
      />
      <View className="absolute inset-0 rounded-full bg-primary dark:bg-primaryDark" style={{ opacity: logged ? 1 : 0 }} />
    </View>
  );
}

// "This week" on Home (design from assets/possible-app-design/home): Mon–Sun,
// two slots per day (top = morning, bottom = evening), today framed, and
// "N of 14 check-ins". Just shows what was logged — nothing "breaks".
export function CheckinWeekCard() {
  const { t, locale } = useTranslation();
  const { checkins } = useCheckinHistory(30);
  const week = useMemo(() => buildCheckinWeek(checkins, todayLocalDate()), [checkins]);
  const labels = WEEKDAY_LABELS_BY_LOCALE[locale];

  return (
    <View className="gap-4 rounded-3xl bg-surface p-5 dark:bg-surfaceDark">
      <View className="flex-row items-center justify-between">
        <Text className="text-md font-semibold text-black dark:text-white">{t('home.thisWeek')}</Text>
        <Text className="text-sm text-gray">{t('home.weekCount', { done: week.logged, total: week.total })}</Text>
      </View>

      <View className="flex-row">
        {week.days.map((day, index) => (
          <View key={day.date} className="flex-1 items-center gap-2">
            <Text
              className="text-sm font-semibold text-black dark:text-white"
              style={{ opacity: day.isToday ? 1 : 0.45 }}
            >
              {labels[index]}
            </Text>
            <View className="relative items-center gap-2 px-2.5 py-2">
              <View
                pointerEvents="none"
                className="absolute inset-0 rounded-xl border-2 border-primary bg-primary/10 dark:border-primaryDark"
                style={{ opacity: day.isToday ? 1 : 0 }}
              />
              <Dot logged={day.morning} pendingToday={day.isToday && !day.morning} />
              <Dot logged={day.evening} pendingToday={day.isToday && !day.evening} />
            </View>
          </View>
        ))}
      </View>

      <View className="flex-row gap-5">
        <View className="flex-row items-center gap-1.5">
          <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: MORNING_LEGEND }} />
          <Text className="text-sm text-strongGray dark:text-gray">{t('home.legendMorning')}</Text>
        </View>
        <View className="flex-row items-center gap-1.5">
          <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: EVENING_LEGEND }} />
          <Text className="text-sm text-strongGray dark:text-gray">{t('home.legendEvening')}</Text>
        </View>
      </View>
    </View>
  );
}
