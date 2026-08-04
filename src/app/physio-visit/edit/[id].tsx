import { useLocalSearchParams, useRouter } from 'expo-router';
import { Text, View } from 'react-native';

import { PhysioAssessmentForm } from '@/components/checkin/PhysioAssessmentForm';
import { usePhysioAssessments, useUpdatePhysioAssessment } from '@/hooks/usePhysioAssessments';
import { useTranslation } from '@/lib/i18n/useTranslation';
import type { PhysioAssessmentFormData } from '@/lib/validations/physioAssessment';
import { toast } from '@/utils/toast';

export default function EditPhysioVisitModal() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const { assessments } = usePhysioAssessments();
  const updatePhysioAssessment = useUpdatePhysioAssessment();

  const assessment = assessments.find((a) => a.id === id);

  if (!assessment) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-6 dark:bg-backgroundDark">
        <Text className="text-gray-500 dark:text-gray-400">{t('common.entryNotFound')}</Text>
      </View>
    );
  }

  const handleSubmit = async (data: PhysioAssessmentFormData) => {
    const { visit_date, physio_name, overall_notes, findings } = data;

    const { error } = await updatePhysioAssessment.mutateAsync({
      id: assessment.id,
      assessment: { visit_date, physio_name, overall_notes },
      findings,
    });

    if (error) {
      toast.error(error);
      return;
    }

    toast.success(t('physioVisit.updatedToast'));
    router.back();
  };

  return (
    <PhysioAssessmentForm
      defaultValues={{
        visit_date: assessment.visit_date,
        physio_name: assessment.physio_name,
        overall_notes: assessment.overall_notes,
        findings: (assessment.muscle_findings ?? []).map((finding) => ({
          muscle_name: finding.muscle_name,
          status: finding.status,
          side: finding.side as 'left' | 'right' | 'bilateral' | null,
          severity: finding.severity,
          notes: finding.notes,
        })),
      }}
      submitLabel={t('physioVisit.saveChanges')}
      onSubmit={handleSubmit}
    />
  );
}
