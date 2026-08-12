import type { SleepPosition } from '@/types/database.types';

export interface Option<T extends string = string> {
  value: T;
  label: string;
}

export const SYMPTOM_OPTIONS: Option<'tingling' | 'numbness' | 'headache'>[] = [
  { value: 'tingling', label: 'Tingling' },
  { value: 'numbness', label: 'Numbness' },
  { value: 'headache', label: 'Headache' },
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

export const PAIN_AREA_OPTIONS: Option[] = [
  { value: 'Neck', label: 'Neck' },
  { value: 'Upper back', label: 'Upper back' },
  { value: 'Mid back', label: 'Mid back' },
  { value: 'Lower back', label: 'Lower back' },
  { value: 'Shoulder (left)', label: 'Shoulder (left)' },
  { value: 'Shoulder (right)', label: 'Shoulder (right)' },
  { value: 'Head', label: 'Head' },
  { value: 'Hip', label: 'Hip' },
  { value: 'Arm', label: 'Arm' },
  { value: 'Leg', label: 'Leg' },
];

export const SLEEP_POSITION_OPTIONS: Option<SleepPosition>[] = [
  { value: 'back', label: 'Back' },
  { value: 'side', label: 'Side' },
  { value: 'stomach', label: 'Stomach' },
];
