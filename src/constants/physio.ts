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

export const MUSCLE_CATEGORY_OPTIONS: { value: string; labelKey: string }[] = [
  { value: 'neck', labelKey: 'physioVisit.category.neck' },
  { value: 'upperBack', labelKey: 'physioVisit.category.upperBack' },
  { value: 'lowerBack', labelKey: 'physioVisit.category.lowerBack' },
  { value: 'hip', labelKey: 'physioVisit.category.hip' },
  { value: 'legs', labelKey: 'physioVisit.category.legs' },
];

// Canonical values stored verbatim in `muscle_findings.muscle_name`, decoupled from
// display via labelKey — same pattern as TRIGGER_OPTIONS/TRIGGER_LABEL_KEYS. Keeping
// the stored value stable (English) regardless of UI locale is what lets the same
// muscle be grouped/charted over time instead of fragmenting per free-text spelling.
// `category` groups these under MUSCLE_CATEGORY_OPTIONS for the category-then-muscle
// picker in MuscleNameField.tsx — purely a UI grouping, not stored anywhere.
export const MUSCLE_NAME_OPTIONS: { value: string; labelKey: string; category: string }[] = [
  { value: 'Sternocleidomastoid (SCM)', labelKey: 'physioVisit.muscle.scm', category: 'neck' },
  { value: 'Levator scapulae', labelKey: 'physioVisit.muscle.levatorScapulae', category: 'neck' },
  { value: 'Splenius capitis', labelKey: 'physioVisit.muscle.spleniusCapitis', category: 'neck' },
  { value: 'Splenius cervicis', labelKey: 'physioVisit.muscle.spleniusCervicis', category: 'neck' },
  { value: 'Suboccipitals', labelKey: 'physioVisit.muscle.suboccipitals', category: 'neck' },
  { value: 'Scalenes', labelKey: 'physioVisit.muscle.scalenes', category: 'neck' },
  { value: 'Erector spinae (cervical)', labelKey: 'physioVisit.muscle.erectorSpinaeCervical', category: 'neck' },
  { value: 'Upper trapezius', labelKey: 'physioVisit.muscle.upperTrapezius', category: 'upperBack' },
  { value: 'Middle trapezius', labelKey: 'physioVisit.muscle.middleTrapezius', category: 'upperBack' },
  { value: 'Lower trapezius', labelKey: 'physioVisit.muscle.lowerTrapezius', category: 'upperBack' },
  { value: 'Rhomboids', labelKey: 'physioVisit.muscle.rhomboids', category: 'upperBack' },
  { value: 'Deltoid', labelKey: 'physioVisit.muscle.deltoid', category: 'upperBack' },
  { value: 'Supraspinatus', labelKey: 'physioVisit.muscle.supraspinatus', category: 'upperBack' },
  { value: 'Infraspinatus', labelKey: 'physioVisit.muscle.infraspinatus', category: 'upperBack' },
  { value: 'Latissimus dorsi', labelKey: 'physioVisit.muscle.latissimusDorsi', category: 'upperBack' },
  { value: 'Erector spinae (thoracic)', labelKey: 'physioVisit.muscle.erectorSpinaeThoracic', category: 'lowerBack' },
  { value: 'Erector spinae (lumbar)', labelKey: 'physioVisit.muscle.erectorSpinaeLumbar', category: 'lowerBack' },
  { value: 'Quadratus lumborum', labelKey: 'physioVisit.muscle.quadratusLumborum', category: 'lowerBack' },
  { value: 'Piriformis', labelKey: 'physioVisit.muscle.piriformis', category: 'hip' },
  { value: 'Gluteus medius', labelKey: 'physioVisit.muscle.gluteusMedius', category: 'hip' },
  { value: 'Gluteus maximus', labelKey: 'physioVisit.muscle.gluteusMaximus', category: 'legs' },
  { value: 'Quadriceps', labelKey: 'physioVisit.muscle.quadriceps', category: 'legs' },
  { value: 'Hamstrings', labelKey: 'physioVisit.muscle.hamstrings', category: 'legs' },
  { value: 'Adductors', labelKey: 'physioVisit.muscle.adductors', category: 'legs' },
  { value: 'Iliotibial band (IT band)', labelKey: 'physioVisit.muscle.itBand', category: 'legs' },
  { value: 'Gastrocnemius', labelKey: 'physioVisit.muscle.gastrocnemius', category: 'legs' },
  { value: 'Soleus', labelKey: 'physioVisit.muscle.soleus', category: 'legs' },
  { value: 'Tibialis anterior', labelKey: 'physioVisit.muscle.tibialisAnterior', category: 'legs' },
];
