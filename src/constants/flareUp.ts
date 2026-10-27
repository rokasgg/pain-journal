import type { FlareUpStatus } from '@/types/database.types';

export const FLARE_UP_STATUS_OPTIONS: {
  value: FlareUpStatus;
  labelKey: string;
  activeClassName: string;
  activeTextClassName: string;
}[] = [
  {
    value: 'resolved',
    labelKey: 'flareUp.statusResolved',
    activeClassName: 'bg-primary dark:bg-primaryDark',
    activeTextClassName: 'text-white',
  },
  {
    value: 'ongoing',
    labelKey: 'flareUp.statusOngoing',
    activeClassName: 'bg-amber-600 dark:bg-amber-500',
    activeTextClassName: 'text-white',
  },
  {
    value: 'unknown',
    labelKey: 'flareUp.statusUnknown',
    activeClassName: 'bg-black dark:bg-white',
    activeTextClassName: 'text-white dark:text-black',
  },
];

// "Kur skauda?" — plain-language regions, stored verbatim in
// flare_ups.pain_areas (so these English values stay stable; labels come from
// the i18n keys below).
export const FLARE_AREA_OPTIONS = [
  'Neck',
  'Shoulders',
  'Between shoulder blades',
  'Head',
  'Upper back',
  'Lower back',
  'Left arm',
  'Right arm',
  'Hip',
  'Leg',
] as const;

export const FLARE_AREA_LABEL_KEYS: Record<string, string> = {
  Neck: 'flareUp.areas.neck',
  Shoulders: 'flareUp.areas.shoulders',
  'Between shoulder blades': 'flareUp.areas.betweenBlades',
  Head: 'flareUp.areas.head',
  'Upper back': 'flareUp.areas.upperBack',
  'Lower back': 'flareUp.areas.lowerBack',
  'Left arm': 'flareUp.areas.leftArm',
  'Right arm': 'flareUp.areas.rightArm',
  Hip: 'flareUp.areas.hip',
  Leg: 'flareUp.areas.leg',
};

// "Kiti simptomai" — optional. The first two are the ones that need a
// clinician's eye (the form shows a warning banner when either is picked).
export const FLARE_SYMPTOM_OPTIONS = ['Hand numbness', 'Hand weakness', 'Dizziness', 'Headache'] as const;
export const FLARE_URGENT_SYMPTOMS: readonly string[] = ['Hand numbness', 'Hand weakness'];

export const FLARE_SYMPTOM_LABEL_KEYS: Record<string, string> = {
  'Hand numbness': 'flareUp.symptoms.handNumbness',
  'Hand weakness': 'flareUp.symptoms.handWeakness',
  Dizziness: 'flareUp.symptoms.dizziness',
  Headache: 'flareUp.symptoms.headache',
};

// "Kas galėjo išprovokuoti?" reuses TRIGGER_OPTIONS / TRIGGER_LABEL_KEYS
// (constants/symptoms.ts), in the design's order.
export const FLARE_TRIGGER_ORDER = [
  'Desk work',
  'Long drive',
  'Poor posture',
  'Poor sleep',
  'Cold weather',
  'Heavy lifting',
  'Stress',
  'Unknown',
] as const;

// "Kada tai prasidėjo?" quick choices, as hours before now (0 = now).
export const FLARE_TIME_PRESETS = [
  { id: 'now', hoursAgo: 0, labelKey: 'flareUp.timeNow' },
  { id: 'h1', hoursAgo: 1, labelKey: 'flareUp.time1h' },
  { id: 'h3', hoursAgo: 3, labelKey: 'flareUp.time3h' },
] as const;
