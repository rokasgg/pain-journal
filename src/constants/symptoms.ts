import type { SleepPosition } from '@/types/database.types';

export interface Option<T extends string = string> {
  value: T;
  label: string;
}

// In the order the check-in's symptom chips show them.
export const SYMPTOM_OPTIONS: Option<'tingling' | 'numbness' | 'weakness' | 'headache' | 'dizziness'>[] = [
  { value: 'tingling', label: 'Tingling' },
  { value: 'numbness', label: 'Numbness' },
  { value: 'weakness', label: 'Weakness' },
  { value: 'headache', label: 'Headache' },
  { value: 'dizziness', label: 'Dizziness' },
];

export const TRIGGER_OPTIONS: Option[] = [
  { value: 'Long drive', label: 'Long drive' },
  { value: 'Desk work', label: 'Desk work' },
  { value: 'Poor posture', label: 'Poor posture' },
  { value: 'Poor sleep', label: 'Poor sleep' },
  { value: 'Cold weather', label: 'Cold weather' },
  { value: 'Heavy lifting', label: 'Heavy lifting' },
  { value: 'Stress', label: 'Stress' },
  { value: 'Unknown', label: 'Unknown' },
];

export const SLEEP_POSITION_OPTIONS: Option<SleepPosition>[] = [
  { value: 'back', label: 'Back' },
  { value: 'side', label: 'Side' },
  { value: 'stomach', label: 'Stomach' },
];

// TRIGGER_OPTIONS and the pain-area values are stored verbatim in the DB
// (triggers text[], symptoms.pain_areas), so they stay stable English
// identifiers — these map each one to its i18n key for display, independent
// of any custom text the user types in. Shared between the checkin chip
// components and the read-only detail view so both localize consistently.
export const TRIGGER_LABEL_KEYS: Record<string, string> = {
  'Long drive': 'triggers.longDrive',
  'Desk work': 'triggers.deskWork',
  'Poor posture': 'triggers.poorPosture',
  'Poor sleep': 'triggers.poorSleep',
  'Cold weather': 'triggers.coldWeather',
  'Heavy lifting': 'triggers.heavyLifting',
  Stress: 'triggers.stress',
  Unknown: 'triggers.unknown',
};

export const PAIN_AREA_LABEL_KEYS: Record<string, string> = {
  Neck: 'painAreas.neck',
  'Upper back': 'painAreas.upperBack',
  'Mid back': 'painAreas.midBack',
  'Lower back': 'painAreas.lowerBack',
  'Shoulder (left)': 'painAreas.shoulderLeft',
  'Shoulder (right)': 'painAreas.shoulderRight',
  Head: 'painAreas.head',
  Hip: 'painAreas.hip',
  Arm: 'painAreas.arm',
  Leg: 'painAreas.leg',
  // Added with the check-in redesign: check-ins now use the same area list as
  // flare-ups (FLARE_AREA_OPTIONS). The keys above are older values.
  Shoulders: 'flareUp.areas.shoulders',
  'Between shoulder blades': 'flareUp.areas.betweenBlades',
  'Left arm': 'flareUp.areas.leftArm',
  'Right arm': 'flareUp.areas.rightArm',
};
