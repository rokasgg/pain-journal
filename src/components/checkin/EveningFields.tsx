import { Controller, useController, type Control } from 'react-hook-form';
import { View } from 'react-native';

import { ScaleSliderCard } from '@/components/checkin/ScaleSliderCard';
import { ChoiceChips, PillChip } from '@/components/flareup/ChoiceChips';
import { SectionTitle } from '@/components/ui/SectionTitle';
import {
  EXERCISE_TYPE_LABEL_KEYS,
  EXERCISE_TYPE_OPTIONS,
  SCREEN_TIME_BUCKETS,
  screenTimeBucketId,
} from '@/lib/checkinChoices';
import type { CheckinSliderHints } from '@/lib/checkinHints';
import { useTranslation } from '@/lib/i18n/useTranslation';
import type { EveningCheckinFormData } from '@/lib/validations/checkin';
import { haptics } from '@/utils/haptics';

export interface EveningFieldsProps {
  control: Control<EveningCheckinFormData>;
  hints?: CheckinSliderHints;
  // Previous evening's activity level, for the ring on the track.
  previousActivity?: number | null;
}

// Stand-in value for the "Nebuvo" / "None" chip.
const NONE = '__none__';

// Evening step 2, "Kaip praėjo diena?" (design: "Registracija · 2 Diena"):
// how much they moved, other physical activity, and screen time.
export function EveningFields({ control, hints, previousActivity }: EveningFieldsProps) {
  const { t } = useTranslation();
  const { field: didExercises } = useController({ control, name: 'did_exercises' });
  const { field: exerciseTypes } = useController({ control, name: 'exercise_types' });

  const activityOptions = [
    { value: NONE, label: t('checkin.activities.none') },
    ...EXERCISE_TYPE_OPTIONS.map((value) => ({ value: value as string, label: t(EXERCISE_TYPE_LABEL_KEYS[value]) })),
  ];
  const selectedActivities = didExercises.value === false ? [NONE] : exerciseTypes.value;

  const handleActivities = (next: string[]) => {
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
    <View className="gap-8">
      <View className="gap-3">
        <SectionTitle title={t('checkin.howMuchMoved')} info={t('checkin.activityLevelInfo')} />
        <Controller
          control={control}
          name="activity_level"
          render={({ field: { value, onChange } }) => (
            <ScaleSliderCard
              preset="activity"
              value={value}
              onChange={onChange}
              previous={previousActivity}
              hint={hints?.activity_level}
              accessibilityLabel={t('checkin.howMuchMoved')}
            />
          )}
        />
      </View>

      <View className="gap-3">
        <SectionTitle title={t('checkin.otherActivity')} optional info={t('checkin.didExercisesInfo')} />
        <ChoiceChips
          options={activityOptions}
          value={selectedActivities}
          onChange={handleActivities}
          allowCustom
          customPlaceholder={t('checkin.addCustomActivityPlaceholder')}
        />
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
    </View>
  );
}
