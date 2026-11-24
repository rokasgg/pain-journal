import type { Ionicons } from '@expo/vector-icons';

import type { Direction, FactorId } from '@/lib/flareDetective';

// Insights → Experiments. Each template is one small, concrete change the
// user can say yes/no to every evening. Titles and how-to lines live under
// experiments.templates.<id> in the translations. `related` links a template
// to the flare-up detective's patterns, so "Test it with an experiment" can
// suggest the one that fits.
export interface ExperimentTemplate {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  related: `${FactorId}:${Direction}`[];
}

export const EXPERIMENT_TEMPLATES: ExperimentTemplate[] = [
  { id: 'noScreensLate', icon: 'phone-portrait-outline', related: ['screenTime:high', 'sleepQuality:low'] },
  { id: 'bedBefore23', icon: 'bed-outline', related: ['sleepHours:low', 'sleepQuality:low'] },
  { id: 'dailyWalk', icon: 'walk-outline', related: ['steps:low', 'activity:low'] },
  { id: 'deskBreaks', icon: 'desktop-outline', related: ['eveningPain:high', 'morningStiffness:high'] },
  { id: 'sleepOnBack', icon: 'moon-outline', related: ['morningStiffness:high'] },
  { id: 'easyAfterTraining', icon: 'barbell-outline', related: ['trained:high', 'activity:high', 'steps:high'] },
];

export const CUSTOM_EXPERIMENT = 'custom';
export const EXPERIMENT_LENGTHS = [7, 14] as const;
export const DEFAULT_EXPERIMENT_LENGTH = 14;

export function templateFor(id: string): ExperimentTemplate | undefined {
  return EXPERIMENT_TEMPLATES.find((tpl) => tpl.id === id);
}

export function templateForPattern(factor: FactorId, direction: Direction): ExperimentTemplate | undefined {
  return EXPERIMENT_TEMPLATES.find((tpl) => tpl.related.includes(`${factor}:${direction}`));
}
