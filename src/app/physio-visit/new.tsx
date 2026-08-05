import { useRouter } from 'expo-router';

import { PhysioAssessmentForm } from '@/components/checkin/PhysioAssessmentForm';
import { useCreatePhysioAssessment } from '@/hooks/usePhysioAssessments';
import { useTranslation } from '@/lib/i18n/useTranslation';
import type { PhysioAssessmentFormData } from '@/lib/validations/physioAssessment';
import { toast } from '@/utils/toast';

export default function NewPhysioVisitModal() {
  const router = useRouter();
  const { t } = useTranslation();
  const createPhysioAssessment = useCreatePhysioAssessment();

  const handleSubmit = async (data: PhysioAssessmentFormData) => {
    const { visit_date, physio_name, overall_notes, findings } = data;

    const { error } = await createPhysioAssessment.mutateAsync({
      assessment: { visit_date, physio_name, overall_notes },
      findings,
    });

    if (error) {
      toast.error(error);
      return;
    }

    router.back();
    toast.success(t('physioVisit.savedToast'));
  };

  return <PhysioAssessmentForm submitLabel={t('physioVisit.logVisit')} onSubmit={handleSubmit} />;
}
