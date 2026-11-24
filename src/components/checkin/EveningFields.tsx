import { Controller, useController, type Control } from 'react-hook-form';
import { Text, View } from 'react-native';

import { HealthActivityCard } from '@/components/checkin/HealthActivityCard';
import { ScaleSliderCard } from '@/components/checkin/ScaleSliderCard';
import { ChoiceChips, PillChip } from '@/components/flareup/ChoiceChips';
import { SectionTitle } from '@/components/ui/SectionTitle';
import {
  EXERCISE_TYPE_LABEL_KEYS,
  EXERCISE_TYPE_OPTIONS,
  SCREEN_TIME_BUCKETS,
  STRESS_LEVELS,
  screenTimeBucketId,
} from '@/lib/checkinChoices';
import type { CheckinSliderHints } from '@/lib/checkinHints';
import { OTHER_WORKOUT } from '@/lib/health/healthMapping';
import type { HealthActivity } from '@/lib/health/healthkit';
import { useTranslation } from '@/lib/i18n/useTranslation';
import type { EveningCheckinFormData } from '@/lib/validations/checkin';
import { haptics } from '@/utils/haptics';

export interface EveningFieldsProps {
  control: Control<EveningCheckinFormData>;
  hints?: CheckinSliderHints;
  // Previous evening's activity level, for the ring on the track.
  previousActivity?: number | null;
  // The day's steps and workouts from Apple Health (new check-ins only, and
  // only when Health is connected — otherwise this step is unchanged).
  healthActivity?: HealthActivity | null;
  // Health's workouts as chip values, shown as the selection while the user
  // hasn't touched the chips (CheckinForm saves them if left as they are).
  healthChipValues?: string[] | null;
  onActivityTouched?: () => void;
}

// Stand-in value for the "Nebuvo" / "None" chip.
const NONE = '__none__';

// Evening step 2, "Kaip praėjo diena?" (design: "Registracija · 2 Diena"):
// how much they moved, other physical activity, and screen time.
export function EveningFields({
  control,
  hints,
  previousActivity,
  healthActivity,
  healthChipValues,
  onActivityTouched,
}: EveningFieldsProps) {
  const { t } = useTranslation();
  const { field: didExercises } = useController({ control, name: 'did_exercises' });
  const { field: exerciseTypes } = useController({ control, name: 'exercise_types' });

  const selectedActivities = healthChipValues ?? (didExercises.value === false ? [NONE] : exerciseTypes.value);
  const activityOptions = [
    { value: NONE, label: t('checkin.activities.none') },
    ...EXERCISE_TYPE_OPTIONS.map((value) => ({ value: value as string, label: t(EXERCISE_TYPE_LABEL_KEYS[value]) })),
    // A Health workout with no matching chip, so it shows translated.
    ...(selectedActivities.includes(OTHER_WORKOUT)
      ? [{ value: OTHER_WORKOUT, label: t(EXERCISE_TYPE_LABEL_KEYS[OTHER_WORKOUT]) }]
      : []),
  ];
  const showHealthCard = !!healthActivity && (healthActivity.steps !== null || healthActivity.workouts.length > 0);

  const handleActivities = (next: string[]) => {
    onActivityTouched?.();
    if (next.includes(NONE) && didExercises.value !== false) {
      didExercises.onChange(false);
      exerciseTypes.onChange([]);
      return;
    }
    const rest = next.filter((value) => value !== NONE);
    exerciseTypes.onChange(rest);
    // No chips left = unanswered again, never an implicit "no".
    didExercises.onChange(rest.length > 0 ? true : null);
  };

  return (
    <View className="gap-5">
      <Controller
        control={control}
        name="activity_level"
        render={({ field: { value, onChange } }) => (
          <ScaleSliderCard
            preset="activity"
            title={t('checkin.howMuchMoved')}
            info={t('checkin.activityLevelInfo')}
            value={value}
            onChange={onChange}
            previous={previousActivity}
            hint={hints?.activity_level}
          />
        )}
      />

      <View className="gap-3">
        <SectionTitle title={t('checkin.otherActivity')} optional info={t('checkin.didExercisesInfo')} />
        {showHealthCard && healthActivity && <HealthActivityCard activity={healthActivity} />}
        <ChoiceChips
          options={activityOptions}
          value={selectedActivities}
          onChange={handleActivities}
          allowCustom
          customPlaceholder={t('checkin.addCustomActivityPlaceholder')}
        />
        {healthChipValues && (
          <Text className="text-[13px] text-inkSecondary dark:text-gray">{t('checkin.health.prefilled')}</Text>
        )}
      </View>

      <View className="gap-3">
        <SectionTitle title={t('checkin.screenTime')} info={t('checkin.screenTimeHoursInfo')} />
        <Controller
          control={control}
          name="screen_time_hours"
          render={({ field: { value, onChange } }) => {
            const selected = screenTimeBucketId(value);
            return (
              <View className="flex-row flex-wrap gap-2.5">
                {SCREEN_TIME_BUCKETS.map((bucket) => (
                  <PillChip
                    key={bucket.id}
                    label={t(bucket.labelKey)}
                    selected={selected === bucket.id}
                    showCheck
                    onPress={() => {
                      haptics.tick();
                      onChange(selected === bucket.id ? null : bucket.hours);
                    }}
                  />
                ))}
              </View>
            );
          }}
        />
      </View>

      <View className="gap-3">
        <SectionTitle title={t('checkin.stressQuestion')} info={t('checkin.stressInfo')} />
        <Controller
          control={control}
          name="stress_level"
          render={({ field: { value, onChange } }) => (
            <View className="flex-row flex-wrap gap-2.5">
              {STRESS_LEVELS.map((level) => (
                <PillChip
                  key={level.value}
                  label={t(level.labelKey)}
                  selected={value === level.value}
                  showCheck
                  onPress={() => {
                    haptics.tick();
                    onChange(value === level.value ? null : level.value);
                  }}
                />
              ))}
            </View>
          )}
        />
      </View>
    </View>
  );
}
