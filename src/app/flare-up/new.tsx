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
    return { error };
  };

  // Toast fires *before* router.back() — not after — so the success toast's
  // checkmark animation starts painting while this screen is still
  // frontmost, instead of racing the outgoing screen-transition animation
  // (see checkin/[type].tsx for the full explanation).
  const handleSaved = () => {
    toast.success(t('flareUp.loggedToast'));
    router.back();
  };

  return (
    <FlareUpForm submitLabel={t('flareUp.logFlareUp')} onSubmit={handleSubmit} onSaved={handleSaved} />
  );
}
