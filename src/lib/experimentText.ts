import { CUSTOM_EXPERIMENT } from '@/constants/experiments';
import { formatOneDecimal } from '@/lib/dates';
import type { Comparison, ExperimentResult } from '@/lib/experimentResult';
import type { Locale } from '@/store/useLocaleStore';
import type { Experiment } from '@/types/database.types';

// Wording for experiments, shared by the Insights card, the experiment page
// and the visit PDF.

type Translate = (key: string, vars?: Record<string, string | number>) => string;

export function experimentTitle(experiment: Pick<Experiment, 'template' | 'custom_title'>, t: Translate): string {
  if (experiment.template === CUSTOM_EXPERIMENT || !experiment.template) return experiment.custom_title?.trim() || '—';
  return t(`experiments.templates.${experiment.template}.title`);
}

export function headlineKey(comparison: Comparison): string {
  return `experiments.result.${comparison.direction}`;
}

function values(comparison: Comparison, locale: Locale) {
  return { during: formatOneDecimal(comparison.during, locale), before: formatOneDecimal(comparison.before, locale) };
}

// The result as separate lines: the pain comparison first, then whichever of
// next-morning pain, stiffness and flare-ups had enough data.
export function resultLines(result: Extract<ExperimentResult, { status: 'ready' }>, t: Translate, locale: Locale): string[] {
  const lines = [t('experiments.result.pain', values(result.pain, locale))];
  if (result.nextMorningPain) lines.push(t('experiments.result.nextMorning', values(result.nextMorningPain, locale)));
  if (result.nextMorningStiffness) lines.push(t('experiments.result.stiffness', values(result.nextMorningStiffness, locale)));
  if (result.flaresPerWeekBefore > 0 || result.flaresPerWeekDuring > 0) {
    lines.push(
      t('experiments.result.flares', {
        during: formatOneDecimal(result.flaresPerWeekDuring, locale),
        before: formatOneDecimal(result.flaresPerWeekBefore, locale),
      }),
    );
  }
  return lines;
}

// One paragraph, for the PDF.
export function resultSummary(result: ExperimentResult, t: Translate, locale: Locale): string | null {
  if (result.status !== 'ready') return null;
  return [t(headlineKey(result.pain)), ...resultLines(result, t, locale), t('experiments.result.caveat')].join(' ');
}
