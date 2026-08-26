import { translate } from '@/lib/i18n/useTranslation';
import type { Locale } from '@/store/useLocaleStore';
import type { MuscleStatus, PhysioAssessment } from '@/types/database.types';

export interface MuscleFindingDraft {
  status: MuscleStatus | null;
  side: 'left' | 'right' | 'bilateral' | null;
  severity: number | null;
}

const SEVERE_THRESHOLD = 6;
const MAX_SUGGESTIONS = 4;

// Rule-based suggestions drawn from the visit HISTORY (not the visit being
// logged now — that hasn't happened yet) — surfaced on the pre-visit screen
// so the user has something to bring up before they even start the new
// assessment. No AI call, just simple trend checks over the last couple of
// visits per muscle.
export function getPreVisitSuggestedQuestions(assessments: PhysioAssessment[], locale: Locale): string[] {
  const questions: string[] = [];
  const [latest, previous] = assessments; // already ordered visit_date desc

  if (!latest) return questions;

  const latestFindings = latest.muscle_findings ?? [];
  const previousFindings = previous?.muscle_findings ?? [];
  const previousByMuscle = new Map(previousFindings.map((f) => [f.muscle_name, f]));

  const hasSevereWeakness = latestFindings.some(
    (f) => f.status === 'weak' && (f.severity ?? 0) > SEVERE_THRESHOLD,
  );
  if (hasSevereWeakness) {
    questions.push(translate(locale, 'physioVisit.wizard.suggestedQuestionWeakness'));
  }

  const hasPersistentWeakness = latestFindings.some(
    (f) => f.status === 'weak' && previousByMuscle.get(f.muscle_name)?.status === 'weak',
  );
  if (hasPersistentWeakness) {
    questions.push(translate(locale, 'physioVisit.wizard.suggestedQuestionPersistentWeakness'));
  }

  const hasSteadyImprovement = latestFindings.some(
    (f) => f.status === 'improving' && previousByMuscle.get(f.muscle_name)?.status === 'improving',
  );
  if (hasSteadyImprovement) {
    questions.push(translate(locale, 'physioVisit.wizard.suggestedQuestionProgress'));
  }

  const hasTight = latestFindings.some((f) => f.status === 'tight');
  if (hasTight) {
    questions.push(translate(locale, 'physioVisit.wizard.suggestedQuestionStretching'));
  }

  return questions.slice(0, MAX_SUGGESTIONS);
}
