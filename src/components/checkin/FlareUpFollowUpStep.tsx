import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { WizardFooter } from '@/components/physioVisitWizard/WizardFooter';
import { useUpdateFlareUp } from '@/hooks/useFlareUps';
import { minutesSince } from '@/lib/dates';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { colors } from '@/lib/theme';
import type { FlareUp } from '@/types/database.types';

export interface FlareUpFollowUpStepProps {
  flareUp: FlareUp;
  onDone: () => void;
}

export function FlareUpFollowUpStep({ flareUp, onDone }: FlareUpFollowUpStepProps) {
  const { t } = useTranslation();
  const updateFlareUp = useUpdateFlareUp();

  const area = flareUp.description?.trim() || flareUp.likely_cause?.trim() || t('flareUp.genericArea');
  const isSaving = updateFlareUp.isPending;

  const handleResolved = async () => {
    await updateFlareUp.mutateAsync({
      id: flareUp.id,
      status: 'resolved',
      resolved_duration_minutes: minutesSince(flareUp.occurred_at),
    });
    onDone();
  };

  const handleStillOngoing = async () => {
    await updateFlareUp.mutateAsync({ id: flareUp.id, status: 'ongoing' });
    onDone();
  };

  return (
    <View className="flex-1">
      <ScrollView className="flex-1" contentContainerClassName="gap-6 px-6 py-6">
        <Text className="text-lg font-semibold text-black dark:text-white">
          {t('flareUp.followUpQuestion', { area })}
        </Text>
      </ScrollView>

      <WizardFooter>
        <Pressable
          onPress={onDone}
          disabled={isSaving}
          className="flex-1 items-center rounded-lg border border-gray-300 py-3 disabled:opacity-50 dark:border-gray-700"
        >
          <Text className="font-semibold text-black dark:text-white">{t('flareUp.followUpSkip')}</Text>
        </Pressable>
        <Pressable
          onPress={handleStillOngoing}
          disabled={isSaving}
          className="flex-1 items-center rounded-lg bg-primaryMuted py-3 disabled:opacity-50 dark:bg-primaryMutedDark"
        >
          {isSaving ? (
            <ActivityIndicator color={colors.gray} />
          ) : (
            <Text className="font-semibold text-black dark:text-white">
              {t('flareUp.followUpStillOngoing')}
            </Text>
          )}
        </Pressable>
        <Pressable
          onPress={handleResolved}
          disabled={isSaving}
          className="flex-1 items-center rounded-lg bg-primary py-3 disabled:opacity-50 dark:bg-primaryDark"
        >
          {isSaving ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text className="font-semibold text-white">{t('flareUp.followUpResolved')}</Text>
          )}
        </Pressable>
      </WizardFooter>
    </View>
  );
}
