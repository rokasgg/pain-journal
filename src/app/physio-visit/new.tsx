import { useNavigation, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PreVisitScreen } from '@/components/physioVisitWizard/PreVisitScreen';
import { Step1VisitInfo } from '@/components/physioVisitWizard/Step1VisitInfo';
import { StepNextVisit } from '@/components/physioVisitWizard/StepNextVisit';
import { StepVisitNotes } from '@/components/physioVisitWizard/StepVisitNotes';
import { WizardProgress } from '@/components/physioVisitWizard/WizardProgress';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { useCreatePhysioAssessment, usePhysioAssessments } from '@/hooks/usePhysioAssessments';
import { useStepHaptic } from '@/hooks/useStepHaptic';
import { todayLocalDate } from '@/lib/dates';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { getPreVisitSuggestedQuestions } from '@/lib/physioSuggestedQuestions';
import type { PhysioQuestionFormData } from '@/lib/validations/physioAssessment';
import { useLocaleStore } from '@/store/useLocaleStore';
import { toast } from '@/utils/toast';

export default function NewPhysioVisitWizard() {
  const router = useRouter();
  const navigation = useNavigation();
  const { t } = useTranslation();
  const locale = useLocaleStore((s) => s.locale);
  const createPhysioAssessment = useCreatePhysioAssessment();
  const { assessments, isLoading: isLoadingAssessments } = usePhysioAssessments();

  const [preVisitDismissed, setPreVisitDismissed] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  useStepHaptic(step);
  const [visitDate, setVisitDate] = useState(todayLocalDate());
  const [physioName, setPhysioName] = useState<string | null>(null);
  const [overallNotes, setOverallNotes] = useState<string | null>(null);
  const [nextVisitDate, setNextVisitDate] = useState<string | null>(null);
  const [questions, setQuestions] = useState<PhysioQuestionFormData[]>([]);
  const [isConfirmDiscardVisible, setIsConfirmDiscardVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const skipExitGuardRef = useRef(false);

  const leftoverQuestions = (assessments[0]?.questions ?? []).filter((q) => !q.discussed && !q.answer);
  const preVisitSuggestedQuestions = useMemo(
    () => getPreVisitSuggestedQuestions(assessments, locale),
    [assessments, locale],
  );
  const showPreVisit =
    !preVisitDismissed && !isLoadingAssessments && (leftoverQuestions.length > 0 || preVisitSuggestedQuestions.length > 0);

  const hasUnsavedChanges =
    physioName !== null ||
    overallNotes !== null ||
    nextVisitDate !== null ||
    questions.length > 0 ||
    step > 1;

  const handleSave = async () => {
    setIsSaving(true);

    const { error } = await createPhysioAssessment.mutateAsync({
      assessment: {
        visit_date: visitDate,
        physio_name: physioName,
        overall_notes: overallNotes,
        next_visit_date: nextVisitDate,
        questions,
      },
      findings: [],
    });

    setIsSaving(false);

    if (error) {
      toast.error(error);
      return;
    }

    skipExitGuardRef.current = true;
    router.back();
    toast.success(t('physioVisit.savedToast'));
  };

  const hasUnsavedChangesRef = useRef(hasUnsavedChanges);
  const pendingLeaveAction = useRef<(() => void) | null>(null);

  useEffect(() => {
    hasUnsavedChangesRef.current = hasUnsavedChanges;
  }, [hasUnsavedChanges]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (skipExitGuardRef.current || !hasUnsavedChangesRef.current) return;

      e.preventDefault();
      pendingLeaveAction.current = () => navigation.dispatch(e.data.action);
      setIsConfirmDiscardVisible(true);
    });

    return unsubscribe;
  }, [navigation]);

  if (isLoadingAssessments) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background dark:bg-backgroundDark" edges={['top']}>
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  if (showPreVisit) {
    return (
      <SafeAreaView className="flex-1 bg-background dark:bg-backgroundDark" edges={['top']}>
        <WizardProgress step={0} onClose={() => router.back()} />
        <PreVisitScreen
          leftoverQuestions={leftoverQuestions}
          suggestedQuestions={preVisitSuggestedQuestions}
          onSkip={() => setPreVisitDismissed(true)}
          onContinue={(carriedQuestions) => {
            setQuestions(carriedQuestions);
            setPreVisitDismissed(true);
          }}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background dark:bg-backgroundDark" edges={['top']}>
      {/* Keeps Back/Continue/Save above the keyboard on every step. Offset 0:
          this screen has no native header. */}
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <WizardProgress step={step} onClose={() => router.back()} totalSteps={3} />

        {step === 1 && (
          <Step1VisitInfo
            visitDate={visitDate}
            physioName={physioName}
            onChangeVisitDate={setVisitDate}
            onChangePhysioName={setPhysioName}
            onNext={() => setStep(2)}
          />
        )}

        {step === 2 && (
          <StepVisitNotes
            overallNotes={overallNotes}
            onChangeOverallNotes={setOverallNotes}
            onBack={() => setStep(1)}
            onNext={() => setStep(3)}
          />
        )}

        {step === 3 && (
          <StepNextVisit
            nextVisitDate={nextVisitDate}
            questions={questions}
            onChangeNextVisitDate={setNextVisitDate}
            onChangeQuestions={setQuestions}
            onBack={() => setStep(2)}
            onSave={handleSave}
            isSaving={isSaving}
          />
        )}
      </KeyboardAvoidingView>

      <ConfirmModal
        visible={isConfirmDiscardVisible}
        title={t('physioVisit.wizard.discardTitle')}
        message={t('physioVisit.wizard.discardMessage')}
        confirmLabel={t('common.delete')}
        variant="destructive"
        onConfirm={() => {
          setIsConfirmDiscardVisible(false);
          skipExitGuardRef.current = true;
          pendingLeaveAction.current?.();
        }}
        onCancel={() => setIsConfirmDiscardVisible(false)}
      />
    </SafeAreaView>
  );
}
