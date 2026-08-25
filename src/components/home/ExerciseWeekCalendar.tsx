import { eachDayOfInterval, endOfWeek, format, isToday, startOfWeek } from 'date-fns';
import { enUS, lt } from 'date-fns/locale';
import { Pressable, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { FULL_FLAME_SVG } from '@/constants/fullFlameSvg';
import { useTranslation } from '@/lib/i18n/useTranslation';

const DATE_FNS_LOCALES = { en: enUS, lt } as const;

const FLAME_WIDTH = 30;
const FLAME_HEIGHT = 56;

function flameHtml(svg: string) {
  return `<!DOCTYPE html>
<html>
  <head>
    <meta name="viewport" content="width=${FLAME_WIDTH}, initial-scale=1, maximum-scale=1, user-scalable=no" />
    <style>
      html, body { margin: 0; padding: 0; background: transparent; overflow: hidden; }
      svg { display: block; width: 100%; height: 100%; }
    </style>
  </head>
  <body>${svg}</body>
</html>`;
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export interface ExerciseWeekCalendarProps {
  exercisedDates: Set<string>;
  onSelectDate: (date: string) => void;
  className?: string;
}

const WEEKDAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export function ExerciseWeekCalendar({ exercisedDates, onSelectDate, className }: ExerciseWeekCalendarProps) {
  const { locale } = useTranslation();
  const dateFnsLocale = DATE_FNS_LOCALES[locale];
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });
  const { t } = useTranslation();
  return (
    <View className={`gap-3 border-primary dark:border-primaryDark border rounded-2xl bg-white p-2 dark:bg-surfaceDark ${className ?? ''}`}>

      <View className="flex-row items-center justify-between p-2">
        <Text className="text-sm font-semibold uppercase text-gray dark:text-gray">
          {t('home.exerciseWeekTitle')}
        </Text>
        <Text className="text-base font-semibold text-gray dark:text-white">
          {capitalize(format(today, 'MMMM yyyy', { locale: dateFnsLocale }))}
        </Text>
      </View>

      <View className="flex-row">
        {WEEKDAY_LABELS.map((label, index) => (
          <View key={index} className="flex-1 items-center">
            <Text className="text-xs font-medium text-gray-500 dark:text-gray">{label}</Text>
          </View>
        ))}
      </View>

      <View className="flex-row">
        {days.map((day, index) => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const isCurrentDay = isToday(day);
          const exercised = exercisedDates.has(dateStr);

          const prevDateStr = index > 0 ? format(days[index - 1], 'yyyy-MM-dd') : null;
          const nextDateStr = index < days.length - 1 ? format(days[index + 1], 'yyyy-MM-dd') : null;
          const connectLeft = exercised && !!prevDateStr && exercisedDates.has(prevDateStr);
          const connectRight = exercised && !!nextDateStr && exercisedDates.has(nextDateStr);

          return (
            <Pressable
              key={dateStr}
              // onPress={() => onSelectDate(dateStr)}
              className="relative flex-1 items-center gap-0.5 py-1.5"
            >
              {(connectLeft || connectRight) && (
                <View
                  pointerEvents="none"
                  style={{
                    position: 'absolute',
                    top: 21,
                    height: 2,
                    left: connectLeft ? 0 : '50%',
                    right: connectRight ? 0 : '50%',
                    backgroundColor: '#3b82f6',
                  }}
                />
              )}
              <View
                style={{ zIndex: 1 }}
                className={`h-8 w-8 items-center justify-center rounded-full ${isCurrentDay ? 'bg-primary dark:bg-primaryDark' : ''
                  }`}
              >
                <Text
                  className={`text-md ${isCurrentDay || exercised ? 'font-semibold text-white' : 'text-black dark:text-white'
                    }`}
                >
                  {format(day, 'd')}
                </Text>
              </View>

              {exercised && (
                <View
                  pointerEvents="none"
                  style={{
                    position: 'absolute',
                    top: 4,
                    left: 0,
                    right: 0,
                    height: 32,
                    zIndex: 0,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <View style={{ width: FLAME_WIDTH, height: FLAME_HEIGHT }}>
                    <WebView
                      originWhitelist={['*']}
                      source={{ html: flameHtml(FULL_FLAME_SVG) }}
                      scrollEnabled={false}
                      pointerEvents="none"
                      style={{ flex: 1, backgroundColor: 'transparent' }}
                      containerStyle={{ backgroundColor: 'transparent' }}
                    />
                  </View>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
