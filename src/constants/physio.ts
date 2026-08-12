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

// Canonical values stored verbatim in `muscle_findings.muscle_name`, decoupled from
// display via labelKey — same pattern as TRIGGER_OPTIONS/TRIGGER_LABEL_KEYS. Keeping
// the stored value stable (English) regardless of UI locale is what lets the same
// muscle be grouped/charted over time instead of fragmenting per free-text spelling.
export const MUSCLE_NAME_OPTIONS: { value: string; labelKey: string }[] = [
  { value: 'Sternocleidomastoid (SCM)', labelKey: 'physioVisit.muscle.scm' },
  { value: 'Upper trapezius', labelKey: 'physioVisit.muscle.upperTrapezius' },
  { value: 'Middle trapezius', labelKey: 'physioVisit.muscle.middleTrapezius' },
  { value: 'Lower trapezius', labelKey: 'physioVisit.muscle.lowerTrapezius' },
  { value: 'Levator scapulae', labelKey: 'physioVisit.muscle.levatorScapulae' },
  { value: 'Rhomboids', labelKey: 'physioVisit.muscle.rhomboids' },
  { value: 'Splenius capitis', labelKey: 'physioVisit.muscle.spleniusCapitis' },
  { value: 'Splenius cervicis', labelKey: 'physioVisit.muscle.spleniusCervicis' },
  { value: 'Suboccipitals', labelKey: 'physioVisit.muscle.suboccipitals' },
  { value: 'Scalenes', labelKey: 'physioVisit.muscle.scalenes' },
  { value: 'Erector spinae (cervical)', labelKey: 'physioVisit.muscle.erectorSpinaeCervical' },
  { value: 'Erector spinae (thoracic)', labelKey: 'physioVisit.muscle.erectorSpinaeThoracic' },
  { value: 'Erector spinae (lumbar)', labelKey: 'physioVisit.muscle.erectorSpinaeLumbar' },
  { value: 'Quadratus lumborum', labelKey: 'physioVisit.muscle.quadratusLumborum' },
  { value: 'Latissimus dorsi', labelKey: 'physioVisit.muscle.latissimusDorsi' },
  { value: 'Deltoid', labelKey: 'physioVisit.muscle.deltoid' },
  { value: 'Supraspinatus', labelKey: 'physioVisit.muscle.supraspinatus' },
  { value: 'Infraspinatus', labelKey: 'physioVisit.muscle.infraspinatus' },
  { value: 'Piriformis', labelKey: 'physioVisit.muscle.piriformis' },
  { value: 'Gluteus medius', labelKey: 'physioVisit.muscle.gluteusMedius' },
];
