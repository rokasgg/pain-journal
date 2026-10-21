import { Ionicons } from '@expo/vector-icons';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import { Pressable, Text, useColorScheme, View } from 'react-native';

import type { DayMarker } from '@/components/history/WeekCalendar';
import { formatDayLabel, formatMonthTitle, WEEKDAY_LABELS_BY_LOCALE } from '@/lib/dates';
import { painTint, type PainTint } from '@/lib/historyCalendar';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { colors } from '@/lib/theme';
import { haptics } from '@/utils/haptics';

// Design palette for the calendar (History redesign spec). Native/runtime
// colours on purpose: every per-day state is applied through `style`, so a
// state change (selection, a new check-in) never swaps NativeWind classes on
// a mounted element (upgrade gotcha, CLAUDE.md).
const PAIN_TINTS: Record<PainTint, string | undefined> = {
  none: undefined,
  free: '#DCEDE0',
  low: '#FCEBD8',
  mid: '#F6C79E',
  high: '#E9A07A',
};
const LEGEND_TINTS: { tint: PainTint; labelKey?: string; label?: string }[] = [
  { tint: 'free', labelKey: 'history.legendPainFree' },
  { tint: 'low', label: '1–3' },
  { tint: 'mid', label: '4–6' },
  { tint: 'high', label: '7–10' },
];
const PAIN_A11Y_KEYS: Record<PainTint, string> = {
  none: 'history.dayPainNone',
  free: 'history.dayPainFree',
  low: 'history.dayPainLow',
  mid: 'history.dayPainMid',
  high: 'history.dayPainHigh',
};
const ACCENT = colors.accent;
const TINTED_TEXT = colors.ink;
const FLARE_RED = '#B42318';
const PALETTE = {
  light: { text: colors.ink, otherMonth: '#C5CDC8', future: '#B9C2BD', dotOff: '#D5DBD7', weekday: '#6B756F' },
  dark: { text: colors.white, otherMonth: '#3A453F', future: '#4A564F', dotOff: '#3A453F', weekday: '#8E9A93' },
} as const;

const CIRCLE = 36;
const DOT = 5;

export interface HistoryCalendarProps {
  visibleMonth: Date; // first day of the shown month
  onChangeMonth: (month: Date) => void;
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
  markers: Record<string, DayMarker>;
  today: string; // local yyyy-MM-dd
  // Dots only show from the user's first check-in on.
  firstCheckinDate: string | null;
  className?: string;
}

// History → Calendar card. Mon-first month grid; per day a 36pt circle tinted
// by average pain, two dots (morning, evening), a flare-up bolt, a ring on
// today and a solid accent circle on the selected day. Legend underneath.
export function HistoryCalendar({
  visibleMonth,
  onChangeMonth,
  selectedDate,
  onSelectDate,
  markers,
  today,
  firstCheckinDate,
  className,
}: HistoryCalendarProps) {
  const { t, locale } = useTranslation();
  const palette = PALETTE[useColorScheme() === 'dark' ? 'dark' : 'light'];
  const weekdayLabels = WEEKDAY_LABELS_BY_LOCALE[locale];
  const isCurrentMonth = format(visibleMonth, 'yyyy-MM') === today.slice(0, 7);

  const gridStart = startOfWeek(startOfMonth(visibleMonth), { weekStartsOn: 1 });
  const gridEnd = endOfWeek(endOfMonth(visibleMonth), { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const changeMonth = (month: Date) => {
    haptics.tick();
    onChangeMonth(month);
  };

  return (
    <View className={`rounded-[18px] bg-surface px-3 py-3.5 dark:bg-surfaceDark ${className ?? ''}`}>
      <View className="flex-row items-center justify-between">
        <Pressable
          onPress={() => changeMonth(subMonths(visibleMonth, 1))}
          accessibilityRole="button"
          accessibilityLabel={t('history.previousMonth')}
          className="h-11 w-11 items-center justify-center active:opacity-60"
        >
          <Ionicons name="chevron-back" size={22} color={ACCENT} />
        </Pressable>
        <Text className="text-base font-semibold" style={{ color: palette.text }}>
          {formatMonthTitle(visibleMonth, locale)}
        </Text>
        <Pressable
          onPress={() => changeMonth(addMonths(visibleMonth, 1))}
          disabled={isCurrentMonth}
          accessibilityRole="button"
          accessibilityLabel={t('history.nextMonth')}
          accessibilityState={{ disabled: isCurrentMonth }}
          className="h-11 w-11 items-center justify-center active:opacity-60"
          style={{ opacity: isCurrentMonth ? 0.3 : 1 }}
        >
          <Ionicons name="chevron-forward" size={22} color={ACCENT} />
        </Pressable>
      </View>

      <View className="mt-1 flex-row">
        {weekdayLabels.map((label, index) => (
          <View key={index} className="flex-1 items-center py-1">
            <Text className="text-xs font-semibold" style={{ color: palette.weekday }}>
              {label}
            </Text>
          </View>
        ))}
      </View>

      <View className="flex-row flex-wrap">
        {days.map((day) => {
          const date = format(day, 'yyyy-MM-dd');
          const marker = markers[date];
          const inMonth = isSameMonth(day, visibleMonth);
          const isFuture = date > today;
          const isToday = date === today;
          const isSelected = inMonth && date === selectedDate;
          const tappable = inMonth && !isFuture;
          const showDots = inMonth && !isFuture && firstCheckinDate !== null && date >= firstCheckinDate;
          const tint = painTint(marker?.avgPain);
          const tintColor = inMonth ? PAIN_TINTS[tint] : undefined;

          const numberColor = isSelected
            ? colors.white
            : !inMonth
              ? palette.otherMonth
              : isFuture
                ? palette.future
                : tintColor
                  ? TINTED_TEXT
                  : palette.text;

          const a11yParts = [
            formatDayLabel(day, locale),
            t(PAIN_A11Y_KEYS[tint]),
            t(marker?.hasMorning ? 'history.dayMorningLogged' : 'history.dayMorningNotLogged'),
            t(marker?.hasEvening ? 'history.dayEveningLogged' : 'history.dayEveningNotLogged'),
            ...(marker?.hasFlareUp ? [t('history.dayFlareUp')] : []),
            ...(isToday ? [t('history.dayToday')] : []),
          ];

          return (
            <Pressable
              key={date}
              onPress={() => {
                if (date !== selectedDate) haptics.tick();
                onSelectDate(date);
              }}
              disabled={!tappable}
              accessible={inMonth}
              accessibilityRole="button"
              accessibilityLabel={a11yParts.join(', ')}
              accessibilityState={{ selected: isSelected, disabled: !tappable }}
              className="h-[50px] items-center justify-center gap-[3px]"
              style={{ width: `${100 / 7}%` }}
            >
              <View
                className="items-center justify-center rounded-full"
                style={{
                  width: CIRCLE,
                  height: CIRCLE,
                  backgroundColor: isSelected ? ACCENT : tintColor,
                  borderWidth: isToday && !isSelected ? 2 : 0,
                  borderColor: ACCENT,
                }}
              >
                <Text
                  className="text-[15px]"
                  style={{ color: numberColor, fontWeight: isSelected || isToday ? '700' : '400' }}
                >
                  {format(day, 'd')}
                </Text>
                {inMonth && marker?.hasFlareUp && (
                  <View
                    pointerEvents="none"
                    className="absolute -right-1 -top-1 h-4 w-4 items-center justify-center rounded-full bg-surface dark:bg-surfaceDark"
                  >
                    <Ionicons name="flash" size={11} color={FLARE_RED} />
                  </View>
                )}
              </View>
              <View className="flex-row gap-[3px]" style={{ height: DOT, opacity: showDots ? 1 : 0 }}>
                <View
                  className="rounded-full"
                  style={{ width: DOT, height: DOT, backgroundColor: marker?.hasMorning ? ACCENT : palette.dotOff }}
                />
                <View
                  className="rounded-full"
                  style={{ width: DOT, height: DOT, backgroundColor: marker?.hasEvening ? ACCENT : palette.dotOff }}
                />
              </View>
            </Pressable>
          );
        })}
      </View>

      <View className="mt-2 flex-row flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-borderLight pt-3 dark:border-borderDark">
        {LEGEND_TINTS.map((item) => (
          <View key={item.tint} className="flex-row items-center gap-1.5">
            <View className="h-3 w-3 rounded-full" style={{ backgroundColor: PAIN_TINTS[item.tint] }} />
            <Text className="text-xs text-[#4A5550] dark:text-gray">{item.labelKey ? t(item.labelKey) : item.label}</Text>
          </View>
        ))}
        <View className="flex-row items-center gap-1.5">
          <View className="flex-row gap-[3px]">
            <View className="rounded-full" style={{ width: DOT, height: DOT, backgroundColor: ACCENT }} />
            <View className="rounded-full" style={{ width: DOT, height: DOT, backgroundColor: ACCENT }} />
          </View>
          <Text className="text-xs text-[#4A5550] dark:text-gray">{t('history.legendSlots')}</Text>
        </View>
      </View>
    </View>
  );
}
