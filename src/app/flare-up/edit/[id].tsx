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

    if (error) {
      toast.error(error);
      return;
    }

    router.back();
    toast.success(t('flareUp.updatedToast'));
  };

  return (
    <FlareUpForm
      defaultValues={{
        occurred_at: flareUp.occurred_at,
        pain_level: flareUp.pain_level,
        likely_cause: flareUp.likely_cause,
        description: flareUp.description,
      }}
      submitLabel={t('flareUp.saveChanges')}
      onSubmit={handleSubmit}
    />
  );
}
