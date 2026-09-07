import { Text, View } from 'react-native';

import { useExerciseMuscleFocus } from '@/hooks/useExerciseMuscleFocus';
import { useTranslation } from '@/lib/i18n/useTranslation';

// Deterministic, zero-AI-cost replacement for "which muscles need work" now
// that physio-visit logging no longer asks the user to self-report muscle
// findings — see useExerciseMuscleFocus. Only renders once there's enough
// exercise-log history to say anything meaningful.
export function ExerciseFocusCard() {
  const { t } = useTranslation();
  const { needsAttention, goingWell, isLoading } = useExerciseMuscleFocus();

  if (isLoading || (needsAttention.length === 0 && goingWell.length === 0)) return null;

  return (
    <View className="gap-2 rounded-2xl bg-surface p-4 dark:bg-surfaceDark">
      <Text className="text-base font-semibold text-black dark:text-white">
        {t('insights.exerciseFocusCardTitle')}
      </Text>
      {needsAttention.length > 0 && (
        <Text className="text-sm text-red-600 dark:text-red-500">
          {t('insights.exerciseFocusNeedsAttention', { muscles: needsAttention.join(', ') })}
        </Text>
      )}
      {goingWell.length > 0 && (
        <Text className="text-sm text-primary dark:text-primaryDark">
          {t('insights.exerciseFocusGoingWell', { muscles: goingWell.join(', ') })}
        </Text>
      )}
    </View>
  );
}
