import { Ionicons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import { Text, View } from 'react-native';

import { EXERCISE_TYPE_LABEL_KEYS } from '@/lib/checkinChoices';
import type { HealthActivity } from '@/lib/health/healthkit';
import { formatCount } from '@/lib/i18n/plural';
import { useTranslation } from '@/lib/i18n/useTranslation';

// Evening step 2: the day's steps and workouts from Apple Health, above the
// activity chips. Shown only when Health is connected and has something for
// the day; read-only (the chips below are what's edited).
export function HealthActivityCard({ activity }: { activity: HealthActivity }) {
  const { t, locale } = useTranslation();
  const steps = activity.steps;
  const grouped = steps === null ? null : new Intl.NumberFormat(locale === 'lt' ? 'lt-LT' : 'en-GB').format(steps);

  return (
    <View className="gap-2 rounded-3xl bg-surface p-4 dark:bg-surfaceDark">
      {grouped !== null && steps !== null && (
        <View className="flex-row items-baseline gap-1.5">
          <Text className="text-[32px] font-bold leading-9 text-ink dark:text-white">{grouped}</Text>
          {/* The number is shown on its own above, so only the noun is needed here. */}
          <Text className="text-base font-semibold text-inkSecondary dark:text-gray">
            {formatCount(steps, 'step', locale).replace(/^\d+\s/, '')}
          </Text>
        </View>
      )}
      {activity.workouts.map((workout, index) => (
        <Text key={`${workout.type}-${index}`} className="text-[15px] text-ink dark:text-white">
          {`${workout.minutes} ${t('checkin.unitMinutes')} · ${t(EXERCISE_TYPE_LABEL_KEYS[workout.type] ?? workout.type)} · ${workout.source}`}
        </Text>
      ))}
      <View className="flex-row items-center gap-1.5 border-t border-borderLight pt-2.5 dark:border-borderDark">
        <Ionicons name="heart" size={15} color="#D9534F" />
        <Text className="text-[13px] text-inkSecondary dark:text-gray">
          {t('checkin.health.source', { time: format(parseISO(activity.updatedAt), 'HH:mm') })}
        </Text>
      </View>
    </View>
  );
}
