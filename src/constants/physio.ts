import type { MuscleStatus } from '@/types/database.types';

export const MUSCLE_STATUS_OPTIONS: {
  value: MuscleStatus;
  labelKey: string;
  activeClassName: string;
  activeTextClassName: string;
}[] = [
  {
    value: 'weak',
    labelKey: 'physioVisit.statusWeak',
    activeClassName: 'bg-red-600 dark:bg-red-500',
    activeTextClassName: 'text-white',
  },
  {
    value: 'tight',
    labelKey: 'physioVisit.statusTight',
    activeClassName: 'bg-amber-600 dark:bg-amber-500',
    activeTextClassName: 'text-white',
  },
  {
    value: 'improving',
    labelKey: 'physioVisit.statusImproving',
    activeClassName: 'bg-primary dark:bg-primaryDark',
    activeTextClassName: 'text-white',
  },
  {
    value: 'normal',
    labelKey: 'physioVisit.statusNormal',
    activeClassName: 'bg-black dark:bg-white',
    activeTextClassName: 'text-white dark:text-black',
  },
];

export const MUSCLE_SIDE_OPTIONS: { value: 'left' | 'right' | 'bilateral'; labelKey: string }[] = [
  { value: 'left', labelKey: 'physioVisit.sideLeft' },
  { value: 'right', labelKey: 'physioVisit.sideRight' },
  { value: 'bilateral', labelKey: 'physioVisit.sideBilateral' },
];
