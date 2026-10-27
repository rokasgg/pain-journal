import { useLocalSearchParams, useRouter } from 'expo-router';
import { Text, View } from 'react-native';

import { FlareUpForm } from '@/components/checkin/FlareUpForm';
import { useFlareUps, useUpdateFlareUp } from '@/hooks/useFlareUps';
import { useTranslation } from '@/lib/i18n/useTranslation';
import type { FlareUpFormData } from '@/lib/validations/flareUp';
import { toast } from '@/utils/toast';

export default function EditFlareUpModal() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const { flareUps } = useFlareUps(90);
  const updateFlareUp = useUpdateFlareUp();

  const flareUp = flareUps.find((f) => f.id === id);

  if (!flareUp) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-6 dark:bg-backgroundDark">
        <Text className="text-gray-500 dark:text-gray">{t('common.entryNotFound')}</Text>
      </View>
    );
  }

  const handleSubmit = async (data: FlareUpFormData) => {
    const { error } = await updateFlareUp.mutateAsync({ id: flareUp.id, ...data });
    return { error };
  };

  // Runs right after a successful save. Toast before router.back() — not
  // after — so the toast's checkmark animation starts painting while this
  // screen is still frontmost, instead of racing the outgoing
  // screen-transition animation.
  const handleSaved = () => {
    toast.success(t('flareUp.updatedToast'));
    router.back();
  };

  return (
    <FlareUpForm
      defaultValues={{
        occurred_at: flareUp.occurred_at,
        pain_level: flareUp.pain_level,
        likely_cause: flareUp.likely_cause,
        description: flareUp.description,
        // Rows from before supabase_flare_up_details_migration.sql have none.
        pain_areas: flareUp.pain_areas ?? [],
        symptoms: flareUp.symptoms ?? [],
        // Old rows only have the single likely_cause text.
        triggers: flareUp.triggers?.length ? flareUp.triggers : flareUp.likely_cause ? [flareUp.likely_cause] : [],
        status: flareUp.status,
      }}
      submitLabel={t('flareUp.saveChanges')}
      onSubmit={handleSubmit}
      onSaved={handleSaved}
    />
  );
}
