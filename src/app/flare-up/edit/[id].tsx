import { useLocalSearchParams, useRouter } from 'expo-router';
import { Text, View } from 'react-native';

import { FlareUpForm } from '@/components/checkin/FlareUpForm';
import { useFlareUps, useUpdateFlareUp } from '@/hooks/useFlareUps';
import type { FlareUpFormData } from '@/lib/validations/flareUp';
import { toast } from '@/utils/toast';

export default function EditFlareUpModal() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { flareUps } = useFlareUps(90);
  const updateFlareUp = useUpdateFlareUp();

  const flareUp = flareUps.find((f) => f.id === id);

  if (!flareUp) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-6 dark:bg-backgroundDark">
        <Text className="text-gray-500 dark:text-gray-400">Entry not found.</Text>
      </View>
    );
  }

  const handleSubmit = async (data: FlareUpFormData) => {
    const { error } = await updateFlareUp.mutateAsync({ id: flareUp.id, ...data });

    if (error) {
      toast.error(error);
      return;
    }

    toast.success('Flare-up updated!');
    router.back();
  };

  return (
    <FlareUpForm
      defaultValues={{
        pain_level: flareUp.pain_level,
        likely_cause: flareUp.likely_cause,
        description: flareUp.description,
      }}
      submitLabel="Save Changes"
      onSubmit={handleSubmit}
    />
  );
}
