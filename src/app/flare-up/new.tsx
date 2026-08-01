import { useRouter } from 'expo-router';

import { FlareUpForm } from '@/components/checkin/FlareUpForm';
import { useCreateFlareUp } from '@/hooks/useFlareUps';
import type { FlareUpFormData } from '@/lib/validations/flareUp';
import { toast } from '@/utils/toast';

export default function NewFlareUpModal() {
  const router = useRouter();
  const createFlareUp = useCreateFlareUp();

  const handleSubmit = async (data: FlareUpFormData) => {
    const { error } = await createFlareUp.mutateAsync(data);

    if (error) {
      toast.error(error);
      return;
    }

    toast.success('Flare-up logged.');
    router.back();
  };

  return <FlareUpForm submitLabel="Log Flare-up" onSubmit={handleSubmit} />;
}
