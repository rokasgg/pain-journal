import { Ionicons } from '@expo/vector-icons';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import { enUS, lt } from 'date-fns/locale';
import { useState } from 'react';
import { Pressable, Text, useColorScheme, View } from 'react-native';

import { useTranslation } from '@/lib/i18n/useTranslation';
import { getPainColor } from '@/lib/painColor';
import { colors } from '@/lib/theme';

const DATE_FNS_LOCALES = { en: enUS, lt } as const;

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export interface DayMarker {
  hasMorning: boolean;
  hasEvening: boolean;
  hasFlareUp: boolean;
  avgPain: number | null;
}

export interface MonthCalendarProps {
  markers: Record<string, DayMarker>;
  onSelectDate: (date: string) => void;
  className?: string;
}

const WEEKDAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export function MonthCalendar({ markers, onSelectDate, className }: MonthCalendarProps) {
  const { t, locale } = useTranslation();
  const dateFnsLocale = DATE_FNS_LOCALES[locale];
  const isDark = useColorScheme() === 'dark';
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(new Date()));

  const gridStart = startOfWeek(startOfMonth(visibleMonth), { weekStartsOn: 1 });
  const gridEnd = endOfWeek(endOfMonth(visibleMonth), { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  return (
    <View className={`gap-3 border-primary dark:border-primaryDark border rounded-2xl bg-white p-2 dark:bg-surfaceDark ${className ?? ''}`}>
      <View className="flex-row items-center justify-between">
        <Pressable
          onPress={() => setVisibleMonth((prev) => subMonths(prev, 1))}
          accessibilityRole="button"
          accessibilityLabel={t('history.previousMonth')}
          className="p-1"
        >
          <Ionicons name="chevron-back" size={20} color={colors.gray} />
        </Pressable>

        <Text className="text-base font-semibold text-black dark:text-white">
          {capitalize(format(visibleMonth, 'MMMM yyyy', { locale: dateFnsLocale }))}
        </Text>

        <Pressable
          onPress={() => setVisibleMonth((prev) => addMonths(prev, 1))}
          accessibilityRole="button"
          accessibilityLabel={t('history.nextMonth')}
          className="p-1"
        >
          <Ionicons name="chevron-forward" size={20} color={colors.gray} />
        </Pressable>
      </View>

      <View className="flex-row">
        {WEEKDAY_LABELS.map((label, index) => (
          <View key={index} className="flex-1 items-center">
            <Text className="text-xs font-medium text-gray-500 dark:text-gray">{label}</Text>
          </View>
        ))}
      </View>

      <View className="flex-row flex-wrap">
        {days.map((day) => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const marker = markers[dateStr];
          const inMonth = isSameMonth(day, visibleMonth);
          const today = isToday(day);
          const painColor = getPainColor(marker?.avgPain, isDark);

          return (
            <Pressable
              key={dateStr}
              onPress={() => onSelectDate(dateStr)}
              className="items-center gap-0.5 py-1.5"
              style={{ width: `${100 / 7}%` }}
            >
              <View
                className={`h-8 w-8 items-center justify-center rounded-full ${today ? 'bg-primary dark:bg-primaryDark' : ''
                  }`}
                style={
                  painColor
                    ? today
                      ? { borderWidth: 2, borderColor: painColor }
                      : { backgroundColor: painColor }
                    : undefined
                }
              >
                <Text
                  className={`text-sm ${today
                    ? 'font-semibold text-white'
                    : inMonth
                      ? 'text-black dark:text-white'
                      : 'text-gray-300 dark:text-gray-700'
                    }`}
                >
                  {format(day, 'd')}
                </Text>
              </View>

              <View className="h-3 flex-row gap-0.5">
                {marker?.hasMorning && <View className="h-1.5 w-1.5 rounded-full bg-blue-500" />}
                {marker?.hasEvening && <View className="h-1.5 w-1.5 rounded-full bg-purple-500" />}
                {marker?.hasFlareUp && <View className="h-1.5 w-1.5 rounded-full bg-red-600" />}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
