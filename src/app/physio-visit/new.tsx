import { useNavigation, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PreVisitScreen } from '@/components/physioVisitWizard/PreVisitScreen';
import { Step1VisitInfo } from '@/components/physioVisitWizard/Step1VisitInfo';
import { Step2MuscleSelection } from '@/components/physioVisitWizard/Step2MuscleSelection';
import { Step3MuscleAssessment } from '@/components/physioVisitWizard/Step3MuscleAssessment';
import { Step4NotesAndNext } from '@/components/physioVisitWizard/Step4NotesAndNext';
import { WizardProgress } from '@/components/physioVisitWizard/WizardProgress';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { useCreatePhysioAssessment, usePhysioAssessments } from '@/hooks/usePhysioAssessments';
import { todayLocalDate } from '@/lib/dates';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { getPreVisitSuggestedQuestions, type MuscleFindingDraft } from '@/lib/physioSuggestedQuestions';
import type { PhysioQuestionFormData } from '@/lib/validations/physioAssessment';
import { useLocaleStore } from '@/store/useLocaleStore';
import type { MuscleFindingInsert } from '@/types/database.types';
import { toast } from '@/utils/toast';

const emptyFinding: MuscleFindingDraft = { status: null, side: null, severity: null };

export default function NewPhysioVisitWizard() {
  const router = useRouter();
  const navigation = useNavigation();
  const { t } = useTranslation();
  const locale = useLocaleStore((s) => s.locale);
  const createPhysioAssessment = useCreatePhysioAssessment();
  const { assessments, isLoading: isLoadingAssessments } = usePhysioAssessments();

  const [preVisitDismissed, setPreVisitDismissed] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [visitDate, setVisitDate] = useState(todayLocalDate());
  const [physioName, setPhysioName] = useState<string | null>(null);
  const [selectedMuscles, setSelectedMuscles] = useState<string[]>([]);
  const [muscleStepIndex, setMuscleStepIndex] = useState(0);
  const [findingsByMuscle, setFindingsByMuscle] = useState<Record<string, MuscleFindingDraft>>({});
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
    selectedMuscles.length > 0 ||
    overallNotes !== null ||
    nextVisitDate !== null ||
    questions.length > 0 ||
    step > 1;

  const handleToggleMuscle = (value: string) => {
    setSelectedMuscles((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
    );
    setFindingsByMuscle((prev) => (prev[value] ? prev : { ...prev, [value]: emptyFinding }));
  };

  const handleAddCustomMuscle = (value: string) => {
    setSelectedMuscles((prev) => [...prev, value]);
    setFindingsByMuscle((prev) => ({ ...prev, [value]: emptyFinding }));
  };

  const handleRemoveMuscle = (value: string) => {
    setSelectedMuscles((prev) => prev.filter((v) => v !== value));
    setFindingsByMuscle((prev) => {
      const next = { ...prev };
      delete next[value];
      return next;
    });
  };

  const currentMuscle = selectedMuscles[muscleStepIndex];

  const handleSave = async () => {
    setIsSaving(true);

    const findings: MuscleFindingInsert[] = selectedMuscles.map((muscleName) => {
      const finding = findingsByMuscle[muscleName] ?? emptyFinding;
      return {
        muscle_name: muscleName,
        status: finding.status ?? 'normal',
        side: finding.side,
        severity: finding.severity,
        notes: null,
      };
    });

    const { error } = await createPhysioAssessment.mutateAsync({
      assessment: {
        visit_date: visitDate,
        physio_name: physioName,
        overall_notes: overallNotes,
        next_visit_date: nextVisitDate,
        questions,
      },
      findings,
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
      <WizardProgress step={step} onClose={() => router.back()} />

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
        <Step2MuscleSelection
          selectedMuscles={selectedMuscles}
          onToggleMuscle={handleToggleMuscle}
          onAddCustomMuscle={handleAddCustomMuscle}
          onRemoveMuscle={handleRemoveMuscle}
          onBack={() => setStep(1)}
          onNext={() => {
            setMuscleStepIndex(0);
            setStep(3);
          }}
        />
      )}

      {step === 3 && currentMuscle && (
        <Step3MuscleAssessment
          muscleValue={currentMuscle}
          index={muscleStepIndex}
          total={selectedMuscles.length}
          finding={findingsByMuscle[currentMuscle] ?? emptyFinding}
          onChange={(finding) =>
            setFindingsByMuscle((prev) => ({ ...prev, [currentMuscle]: finding }))
          }
          onBack={() => {
            if (muscleStepIndex === 0) setStep(2);
            else setMuscleStepIndex((i) => i - 1);
          }}
          onNext={() => {
            if (muscleStepIndex < selectedMuscles.length - 1) {
              setMuscleStepIndex((i) => i + 1);
            } else {
              setStep(4);
            }
          }}
        />
      )}

      {step === 4 && (
        <Step4NotesAndNext
          overallNotes={overallNotes}
          nextVisitDate={nextVisitDate}
          questions={questions}
          onChangeOverallNotes={setOverallNotes}
          onChangeNextVisitDate={setNextVisitDate}
          onChangeQuestions={setQuestions}
          onBack={() => setStep(3)}
          onSave={handleSave}
          isSaving={isSaving}
        />
      )}

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
