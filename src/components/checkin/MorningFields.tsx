import { useState } from 'react';
import { Controller, useController, type Control } from 'react-hook-form';
import { Text, View } from 'react-native';

import { ScaleSliderCard } from '@/components/checkin/ScaleSliderCard';
import { SleepDurationCard } from '@/components/checkin/SleepDurationCard';
import { SleepPositionPicker } from '@/components/checkin/SleepPositionPicker';
import { SettingsTextArea } from '@/components/settings/SettingsTextArea';
import { SectionTitle } from '@/components/ui/SectionTitle';
import type { CheckinSliderHints } from '@/lib/checkinHints';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { healthAsleepHours, type HealthSleep } from '@/lib/sleep';
import type { MorningCheckinFormData } from '@/lib/validations/checkin';

export interface MorningFieldsProps {
  control: Control<MorningCheckinFormData>;
  hints?: CheckinSliderHints;
  // Previous morning's sleep quality, for the ring on the track.
  previousSleep?: number | null;
  // "Praėjusį kartą: 7 val." under the duration card.
  durationHint?: string;
  // Last night from Apple Health, if available (see useHealthSleep).
  health?: HealthSleep | null;
}

const SLEEP_POSITIONS = ['back', 'side', 'stomach'] as const;
type SleepPositionValue = (typeof SLEEP_POSITIONS)[number];

// Morning step 2, "Kaip miegojote?" (design: assets/possible-app-design/
// check-in-morning): sleep quality, how long (Apple Health or a −/+ stepper),
// sleep position (several allowed) and notes.
export function MorningFields({ control, hints, previousSleep, durationHint, health }: MorningFieldsProps) {
  const { t } = useTranslation();
  const [isEditingHealth, setIsEditingHealth] = useState(false);
  const { field: positions } = useController({ control, name: 'sleep_positions' });
  const { field: firstPosition } = useController({ control, name: 'sleep_position' });

  // sleep_position keeps the first real position, so older readers still work.
  const handlePositions = (next: string[]) => {
    positions.onChange(next);
    const first = next.find((value): value is SleepPositionValue => (SLEEP_POSITIONS as readonly string[]).includes(value));
    firstPosition.onChange(first ?? null);
  };

  return (
    <View className="gap-8">
      <View className="gap-3">
        <SectionTitle title={t('checkin.sleepQuality')} info={t('checkin.sleepQualityInfo')} />
        <Controller
          control={control}
          name="sleep_quality"
          render={({ field: { value, onChange } }) => (
            <ScaleSliderCard
              preset="sleep"
              value={value}
              onChange={onChange}
              previous={previousSleep}
              hint={hints?.sleep_quality}
              accessibilityLabel={t('checkin.sleepQuality')}
            />
          )}
        />
      </View>

      <View className="gap-3">
        <SectionTitle title={t('checkin.howLongSlept')} info={t('checkin.sleepHoursInfo')} />
        <Controller
          control={control}
          name="sleep_hours"
          render={({ field: { value, onChange } }) => (
            <SleepDurationCard
              value={value}
              onChange={onChange}
              hint={durationHint}
              health={health}
              isEditingHealth={isEditingHealth}
              // "Pataisyti" starts the stepper from what Health reported.
              onEditHealth={() => {
                if (health) onChange(healthAsleepHours(health));
                setIsEditingHealth(true);
              }}
              accessibilityLabel={t('checkin.sleepHoursA11y')}
            />
          )}
        />
      </View>

      <View className="gap-3">
        <SectionTitle
          title={t('checkin.sleepPosition')}
          info={t('checkin.sleepPositionInfo')}
          right={<Text className="text-sm text-inkSecondary dark:text-gray">{t('checkin.pickSeveral')}</Text>}
        />
        <SleepPositionPicker value={positions.value ?? []} onChange={handlePositions} />
      </View>

      <View className="gap-3">
        <SectionTitle title={t('flareUp.notesLabel')} optional />
        <Controller
          control={control}
          name="notes"
          render={({ field: { value, onChange } }) => (
            <SettingsTextArea
              value={value ?? ''}
              onChangeText={onChange}
              placeholder={t('checkin.notesPlaceholderMorning')}
              accessibilityLabel={t('flareUp.notesLabel')}
            />
          )}
        />
      </View>
    </View>
  );
}

