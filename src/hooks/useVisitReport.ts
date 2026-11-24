import { useState } from 'react';

import { useCheckinHistory } from '@/hooks/useCheckins';
import { useExerciseLogHistory } from '@/hooks/useExerciseLogs';
import { useExperimentResults } from '@/hooks/useExperiments';
import { useFlareUps } from '@/hooks/useFlareUps';
import { useJourney } from '@/hooks/useJourney';
import { usePhysioAssessments } from '@/hooks/usePhysioAssessments';
import { useProfile } from '@/hooks/useProfile';

import { lastCountedDay } from '@/lib/experimentResult';
import { experimentTitle, resultSummary } from '@/lib/experimentText';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { usePhysioNotesStore } from '@/store/usePhysioNotesStore';
import { buildVisitReportHtml, visitReportPeriod } from '@/lib/visitReport';
import { toast } from '@/utils/toast';

// "Prepare a summary for the visit": the user's own data since the last
// visit (src/lib/visitReport.ts) → PDF (expo-print) → share sheet
// (expo-sharing). Both native modules are loaded only on tap, so an older
// build without them shows a message instead of crashing the Insights tab.
export function useVisitReport() {
  const { t, locale } = useTranslation();
  const { checkins } = useCheckinHistory(365);
  const { flareUps } = useFlareUps(365);
  const { assessments } = usePhysioAssessments();
  const { profile } = useProfile();
  const { trainingEnabled } = useJourney();
  const { logs } = useExerciseLogHistory(365);
  const { experiments, resultFor, today } = useExperimentResults();
  const chatNotes = usePhysioNotesStore((s) => s.notes);
  const [isPreparing, setIsPreparing] = useState(false);
  const period = visitReportPeriod(assessments[0], today);

  // Experiments that overlapped the period and have a result to report.
  const experimentItems = experiments
    .filter((e) => e.started_on <= period.to && lastCountedDay(e, today) >= period.from)
    .map((e) => ({ title: experimentTitle(e, t), summary: resultSummary(resultFor(e), t, locale) }))
    .filter((e): e is { title: string; summary: string } => e.summary !== null);

  const share = async () => {
    if (isPreparing) return;
    setIsPreparing(true);
    try {
      const [Print, Sharing] = await Promise.all([import('expo-print'), import('expo-sharing')]);
      const html = buildVisitReportHtml({
        period,
        checkins,
        flareUps,
        injuryDescription: profile?.injury_description,
        chatNotes,
        // The questions the user wrote down for the next visit and hasn't
        // discussed yet (the same ones physio-visit/new carries over).
        openQuestions: (assessments[0]?.questions ?? []).filter((q) => !q.discussed && !q.answer).map((q) => q.text),
        exerciseLogs: trainingEnabled ? logs : null,
        experiments: experimentItems,
        locale,
        t,
      });
      const { uri } = await Print.printToFileAsync({ html });
      if (!(await Sharing.isAvailableAsync())) {
        toast.error(t('visitReport.shareUnavailable'));
        return;
      }
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        UTI: 'com.adobe.pdf',
        dialogTitle: t('visitReport.title'),
      });
      usePhysioNotesStore.getState().clear();
    } catch {
      toast.error(t('visitReport.failed'));
    } finally {
      setIsPreparing(false);
    }
  };

  return { share, isPreparing, sinceLastVisit: period.sinceLastVisit };
}
