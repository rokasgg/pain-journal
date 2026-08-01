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
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';

import { colors } from '@/lib/theme';

export interface DayMarker {
  hasMorning: boolean;
  hasEvening: boolean;
  hasFlareUp: boolean;
}

export interface MonthCalendarProps {
  markers: Record<string, DayMarker>;
  onSelectDate: (date: string) => void;
  className?: string;
}

const WEEKDAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export function MonthCalendar({ markers, onSelectDate, className }: MonthCalendarProps) {
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(new Date()));

  const gridStart = startOfWeek(startOfMonth(visibleMonth), { weekStartsOn: 1 });
  const gridEnd = endOfWeek(endOfMonth(visibleMonth), { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  return (
    <View className={`gap-3 ${className ?? ''}`}>
      <View className="flex-row items-center justify-between">
        <Pressable
          onPress={() => setVisibleMonth((prev) => subMonths(prev, 1))}
          accessibilityRole="button"
          accessibilityLabel="Previous month"
          className="p-1"
        >
          <Ionicons name="chevron-back" size={20} color={colors.gray} />
        </Pressable>

        <Text className="text-base font-semibold text-black dark:text-white">
          {format(visibleMonth, 'MMMM yyyy')}
        </Text>

        <Pressable
          onPress={() => setVisibleMonth((prev) => addMonths(prev, 1))}
          accessibilityRole="button"
          accessibilityLabel="Next month"
          className="p-1"
        >
          <Ionicons name="chevron-forward" size={20} color={colors.gray} />
        </Pressable>
      </View>

      <View className="flex-row">
        {WEEKDAY_LABELS.map((label, index) => (
          <View key={index} className="flex-1 items-center">
            <Text className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</Text>
          </View>
        ))}
      </View>

      <View className="flex-row flex-wrap">
        {days.map((day) => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const marker = markers[dateStr];
          const inMonth = isSameMonth(day, visibleMonth);
          const today = isToday(day);

          return (
            <Pressable
              key={dateStr}
              onPress={() => onSelectDate(dateStr)}
              className="items-center gap-0.5 py-1.5"
              style={{ width: `${100 / 7}%` }}
            >
              <View
                className={`h-8 w-8 items-center justify-center rounded-full ${
                  today ? 'bg-black dark:bg-white' : ''
                }`}
              >
                <Text
                  className={`text-sm ${
                    today
                      ? 'font-semibold text-white dark:text-black'
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
