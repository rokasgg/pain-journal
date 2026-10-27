import { Text, View } from 'react-native';

import { TriggerChips } from '@/components/checkin/TriggerChips';
import { SettingsTextArea } from '@/components/settings/SettingsTextArea';
import { ChoiceChips } from '@/components/flareup/ChoiceChips';
import { SectionTitle } from '@/components/ui/SectionTitle';
import { FLARE_AREA_LABEL_KEYS, FLARE_AREA_OPTIONS } from '@/constants/flareUp';
import { PAIN_AREA_LABEL_KEYS, SYMPTOM_OPTIONS } from '@/constants/symptoms';
import { useTranslation } from '@/lib/i18n/useTranslation';
import type { CheckinSymptoms } from '@/types/database.types';

// Stand-in value for the "Nėra" / "None" chip inside the symptom chip group.
const NONE = '__none__';
const KNOWN_SYMPTOMS = new Set<string>(SYMPTOM_OPTIONS.map((option) => option.value));

export interface CheckinSymptomsSectionProps {
  symptoms: CheckinSymptoms;
  onSymptomsChange: (next: CheckinSymptoms) => void;
  // "No symptoms" is a real answer, separate from leaving the step blank.
  noSymptomsConfirmed: boolean;
  onSelectNoSymptoms: () => void;
  // "Kur jaučiate?" only makes sense when the user said they're in pain.
  showAreas: boolean;
  // Morning keeps the trigger chips (evening dropped them in the redesign).
  triggers?: string[];
  onTriggersChange?: (next: string[]) => void;
  // Evening notes live here, on the last step. Morning's notes are on step 2.
  notes?: string | null;
  onNotesChange?: (next: string) => void;
  errorMessage?: string;
}

// The symptoms step (design: "Registracija · 3 Simptomai"): "Ar buvo
// simptomų?" chips (Nėra is the explicit "no symptoms" answer), "Kur
// jaučiate?" chips and a notes card. Chip values are stable English
// identifiers / typed custom text, like the rest of the check-in data.
export function CheckinSymptomsSection({
  symptoms,
  onSymptomsChange,
  noSymptomsConfirmed,
  onSelectNoSymptoms,
  showAreas,
  triggers,
  onTriggersChange,
  notes,
  onNotesChange,
  errorMessage,
}: CheckinSymptomsSectionProps) {
  const { t } = useTranslation();

  const symptomOptions = [
    { value: NONE, label: t('checkin.noneChip') },
    ...SYMPTOM_OPTIONS.map((option) => ({ value: option.value as string, label: t(`symptoms.${option.value}`) })),
  ];
  const selectedSymptoms = noSymptomsConfirmed
    ? [NONE]
    : [...SYMPTOM_OPTIONS.filter((option) => symptoms[option.value]).map((option) => option.value as string), ...(symptoms.custom ?? [])];

  const handleSymptoms = (next: string[]) => {
    if (next.includes(NONE) && !noSymptomsConfirmed) {
      onSelectNoSymptoms();
      return;
    }
    const rest = next.filter((value) => value !== NONE);
    const flags: CheckinSymptoms = {};
    for (const option of SYMPTOM_OPTIONS) flags[option.value] = rest.includes(option.value);
    onSymptomsChange({ ...symptoms, ...flags, custom: rest.filter((value) => !KNOWN_SYMPTOMS.has(value)) });
  };

  // The shared area list, plus any older value already saved on this entry
  // (e.g. "Mid back") so editing it still shows a proper chip.
  const selectedAreas = symptoms.pain_areas ?? [];
  const knownAreas = new Set<string>(FLARE_AREA_OPTIONS);
  const areaOptions = [
    ...FLARE_AREA_OPTIONS.map((value) => ({ value: value as string, label: t(FLARE_AREA_LABEL_KEYS[value]) })),
    ...selectedAreas
      .filter((value) => !knownAreas.has(value) && PAIN_AREA_LABEL_KEYS[value])
      .map((value) => ({ value, label: t(PAIN_AREA_LABEL_KEYS[value]) })),
  ];

  return (
    <View className="gap-8">
      <View className="gap-3">
        <SectionTitle title={t('checkin.hadSymptoms')} info={t('checkin.symptomsInfo')} />
        {errorMessage && <Text className="text-sm text-red-600 dark:text-red-500">{errorMessage}</Text>}
        <ChoiceChips
          options={symptomOptions}
          value={selectedSymptoms}
          onChange={handleSymptoms}
          allowCustom
          customPlaceholder={t('checkin.addCustomSymptomPlaceholder')}
        />
      </View>

      {showAreas && (
        <View className="gap-3">
          <SectionTitle title={t('checkin.whereDoYouFeelIt')} info={t('checkin.painAreasInfo')} />
          <ChoiceChips
            options={areaOptions}
            value={selectedAreas}
            onChange={(next) => onSymptomsChange({ ...symptoms, pain_areas: next })}
          />
        </View>
      )}

      {triggers && onTriggersChange && showAreas && <TriggerChips value={triggers} onChange={onTriggersChange} />}

      {onNotesChange && (
        <View className="gap-3">
          <SectionTitle title={t('flareUp.notesLabel')} optional />
          <SettingsTextArea
            value={notes ?? ''}
            onChangeText={onNotesChange}
            placeholder={t('checkin.notesPlaceholderEvening')}
            accessibilityLabel={t('flareUp.notesLabel')}
          />
        </View>
      )}
    </View>
  );
}
