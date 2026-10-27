import { Ionicons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import { Pressable, Text, useColorScheme, View } from 'react-native';

import { useTranslation } from '@/lib/i18n/useTranslation';
import {
  TIMELINE_AXIS,
  formatDuration,
  splitHours,
  stepSleepHours,
  timelineSegment,
  type HealthSleep,
} from '@/lib/sleep';
import { colors } from '@/lib/theme';
import { haptics } from '@/utils/haptics';

export interface SleepDurationCardProps {
  // Decimal hours (7.5 = 7 h 30 min); null = not answered yet.
  value: number | null;
  onChange: (hours: number) => void;
  maxHours?: number;
  // Previous morning's answer, shown as "Praėjusį kartą: 7 val.".
  hint?: string;
  // Apple Health's sleep for this night. While it is shown (and the user
  // hasn't tapped "Pataisyti"), the card is read-only and `value` follows it.
  health?: HealthSleep | null;
  isEditingHealth?: boolean;
  onEditHealth?: () => void;
  accessibilityLabel: string;
}

const HEALTH_BLUE = '#6E8FC2';

// "Kiek miegojote?" (design: "Rytas – miegas" and "(Apple Sveikata)"): a
// −/+ stepper in 30-minute steps, or — when Apple Health has the night — the
// duration with start/end times, a 21:00–09:00 bar and a "Pataisyti" button.
export function SleepDurationCard({
  value,
  onChange,
  maxHours = 14,
  hint,
  health,
  isEditingHealth = false,
  onEditHealth,
  accessibilityLabel,
}: SleepDurationCardProps) {
  const { t } = useTranslation();
  const isDark = useColorScheme() === 'dark';
  const units = { hours: t('checkin.unitHours'), minutes: t('checkin.unitMinutes') };
  const buttonFill = isDark ? colors.segmentTrackDark : colors.accentMuted;
  const accent = isDark ? colors.primaryDark : colors.accent;
  const showHealth = !!health && !isEditingHealth;

  if (showHealth && health) {
    const start = parseISO(health.start);
    const end = parseISO(health.end);
    const { leftPct, widthPct } = timelineSegment(start, end);
    const asleep = splitHours(health.asleepMinutes / 60);
    return (
      <View className="gap-3 rounded-3xl bg-surface p-4 dark:bg-surfaceDark">
        <View className="flex-row items-start gap-2">
          <View className="flex-1 gap-1">
            <View className="flex-row items-baseline gap-1">
              <Text className="text-[40px] font-bold leading-[44px] text-ink dark:text-white">{asleep.hours}</Text>
              <Text className="text-base font-semibold text-inkSecondary dark:text-gray">{units.hours}</Text>
              <Text className="ml-1.5 text-[40px] font-bold leading-[44px] text-ink dark:text-white">{asleep.minutes}</Text>
              <Text className="text-base font-semibold text-inkSecondary dark:text-gray">{units.minutes}</Text>
            </View>
            <Text className="text-sm text-inkSecondary dark:text-gray">
              {`${format(start, 'HH:mm')} – ${format(end, 'HH:mm')}`}
              {health.inBedMinutes != null
                ? ` · ${t('checkin.health.inBed', { duration: formatDuration(health.inBedMinutes, units) })}`
                : ''}
            </Text>
          </View>
          <Pressable
            onPress={() => {
              haptics.tick();
              onEditHealth?.();
            }}
            accessibilityRole="button"
            className="h-[34px] items-center justify-center rounded-[10px] border border-[#C7D9CC] px-3 active:opacity-70 dark:border-borderDark"
          >
            <Text className="text-sm font-semibold text-[#1F3E2C] dark:text-white">{t('checkin.health.edit')}</Text>
          </Pressable>
        </View>

        <View accessibilityLabel={t('checkin.health.timelineA11y')} className="gap-1.5">
          <View className="h-2.5 overflow-hidden rounded-full bg-background dark:bg-backgroundDark">
            {/* Position and width are runtime percentages NativeWind can't express. */}
            <View
              className="absolute bottom-0 top-0 rounded-full"
              style={{ left: `${leftPct}%`, width: `${widthPct}%`, backgroundColor: HEALTH_BLUE }}
            />
          </View>
          <View className="flex-row justify-between">
            {TIMELINE_AXIS.map((label) => (
              <Text key={label} className="text-[11px] text-inkSecondary dark:text-gray">
                {label}
              </Text>
            ))}
          </View>
        </View>

        <View className="flex-row items-center gap-1.5 border-t border-borderLight pt-2.5 dark:border-borderDark">
          <Ionicons name="heart" size={15} color="#D9534F" />
          <Text className="text-[13px] text-inkSecondary dark:text-gray">
            {t('checkin.health.source', { time: format(parseISO(health.updatedAt), 'HH:mm') })}
          </Text>
        </View>
      </View>
    );
  }

  const parts = value === null ? null : splitHours(value);

  return (
    <View className="items-center gap-3 rounded-3xl bg-surface p-4 dark:bg-surfaceDark">
      <View
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={accessibilityLabel}
        accessibilityValue={parts ? { text: formatDuration(Math.round((value ?? 0) * 60), units) } : { text: t('common.notAnswered') }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(event) =>
          onChange(stepSleepHours(value, event.nativeEvent.actionName === 'increment' ? 1 : -1, maxHours))
        }
        className="w-full flex-row items-center gap-3"
      >
        <Pressable
          onPress={() => {
            haptics.tick();
            onChange(stepSleepHours(value, -1, maxHours));
          }}
          accessibilityRole="button"
          accessibilityLabel={t('checkin.lessThirtyMinutes')}
          className="h-12 w-12 items-center justify-center rounded-full active:opacity-70"
          style={{ backgroundColor: buttonFill }}
        >
          <Ionicons name="remove" size={24} color={accent} />
        </Pressable>

        <View className="flex-1 flex-row items-baseline justify-center gap-1">
          {parts ? (
            <>
              <Text className="text-[40px] font-bold leading-[44px] text-ink dark:text-white">{parts.hours}</Text>
              <Text className="text-base font-semibold text-inkSecondary dark:text-gray">{units.hours}</Text>
              <Text className="ml-1.5 text-[40px] font-bold leading-[44px] text-ink dark:text-white">{parts.minutes}</Text>
              <Text className="text-base font-semibold text-inkSecondary dark:text-gray">{units.minutes}</Text>
            </>
          ) : (
            // Unanswered: never looks like a real 0 hours.
            <Text className="text-[40px] font-bold leading-[44px] text-gray">—</Text>
          )}
        </View>

        <Pressable
          onPress={() => {
            haptics.tick();
            onChange(stepSleepHours(value, 1, maxHours));
          }}
          accessibilityRole="button"
          accessibilityLabel={t('checkin.moreThirtyMinutes')}
          className="h-12 w-12 items-center justify-center rounded-full active:opacity-70"
          style={{ backgroundColor: buttonFill }}
        >
          <Ionicons name="add" size={24} color={accent} />
        </Pressable>
      </View>

      {hint && (
        <View className="flex-row items-center gap-1.5">
          <View className="h-2.5 w-2.5 rounded-full border-2 border-inkSecondary bg-surface dark:bg-surfaceDark" />
          <Text className="text-[15px] text-inkSecondary dark:text-gray">{hint}</Text>
        </View>
      )}
    </View>
  );
}
