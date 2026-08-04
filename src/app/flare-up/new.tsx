import { useRouter } from 'expo-router';

import { FlareUpForm } from '@/components/checkin/FlareUpForm';
import { useCreateFlareUp } from '@/hooks/useFlareUps';
import { useTranslation } from '@/lib/i18n/useTranslation';
import type { FlareUpFormData } from '@/lib/validations/flareUp';
import { toast } from '@/utils/toast';

export default function NewFlareUpModal() {
  const router = useRouter();
  const { t } = useTranslation();
  const createFlareUp = useCreateFlareUp();

  const handleSubmit = async (data: FlareUpFormData) => {
    const { error } = await createFlareUp.mutateAsync(data);

    if (error) {
      toast.error(error);
      return;
    }

    toast.success(t('flareUp.loggedToast'));
    router.back();
  };

  return <FlareUpForm submitLabel={t('flareUp.logFlareUp')} onSubmit={handleSubmit} />;
}
