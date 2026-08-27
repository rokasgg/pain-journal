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
