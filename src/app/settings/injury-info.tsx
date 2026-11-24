import { Ionicons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';

import { MultiSelectChips } from '@/components/onboarding/MultiSelectChips';
import { SingleSelectList } from '@/components/onboarding/SingleSelectList';
import { SettingsDateRow } from '@/components/settings/SettingsDateRow';
import { SettingsFieldRow } from '@/components/settings/SettingsFieldRow';
import { SettingsSection } from '@/components/settings/SettingsSection';
import { SettingsTextArea } from '@/components/settings/SettingsTextArea';
import { useProfile, useUpdateProfile } from '@/hooks/useProfile';
import { currentDateFnsLocale, daysSince } from '@/lib/dates';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { colors } from '@/lib/theme';
import { DIAGNOSED_BY_OPTIONS, DIAGNOSIS_STATUS_OPTIONS } from '@/constants/onboarding';
import type { DiagnosedBy, DiagnosisStatus, Profile, ProfileUpdate } from '@/types/database.types';
import { toast } from '@/utils/toast';
import { useKeepFocusedInputVisible } from '@/hooks/useKeepFocusedInputVisible';

const DESCRIPTION_MAX_LENGTH = 500;
// Save the description this long after typing stops (and on blur / leaving).
const DESCRIPTION_SAVE_DELAY_MS = 800;

// Only rendered once a healing date is set.
function HealingHero({ healingStartedOn }: { healingStartedOn: string }) {
  const { t } = useTranslation();

  return (
    <View className="flex-row items-center gap-4 rounded-3xl bg-primary/10 p-4">
      <View className="h-14 w-14 items-center justify-center rounded-full bg-primary dark:bg-primaryDark">
        <Ionicons name="leaf-outline" size={24} color={colors.white} />
      </View>
      <View className="flex-1 gap-0.5">
        <Text className="text-lg font-bold text-black dark:text-white">
          {/* Same count as Home's DaysSinceHealing pill, 1-based ("day 1" = the start day). */}
          {t('injuryInfo.dayOfHealing', { day: daysSince(healingStartedOn) + 1 })}
        </Text>
        <Text className="text-sm text-strongGray dark:text-white/80">
          {t('injuryInfo.countingFrom', {
            date: format(parseISO(healingStartedOn), 'd MMM yyyy', { locale: currentDateFnsLocale() }),
          })}
        </Text>
      </View>
    </View>
  );
}

// A text field that saves on blur and when the page closes, only if changed.
function useBlurSavedText(initial: string | null | undefined, onSave: (value: string | null) => void) {
  const [value, setState] = useState(initial ?? '');
  const savedRef = useRef(initial ?? '');
  const valueRef = useRef(value);
  const setValue = (next: string) => {
    valueRef.current = next;
    setState(next);
  };
  const flush = () => {
    if (valueRef.current === savedRef.current) return;
    savedRef.current = valueRef.current;
    onSave(valueRef.current.trim() || null);
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => () => flush(), []);
  return { value, setValue, flush };
}

// The professional's diagnosis, recorded exactly as the user was told it.
// Same columns as onboarding's diagnosis step; the app never suggests one.
function DiagnosisCard({
  profile,
  save,
}: {
  profile: Profile | null;
  save: (updates: ProfileUpdate) => Promise<boolean>;
}) {
  const { t } = useTranslation();
  const [status, setStatus] = useState<DiagnosisStatus | null>(profile?.diagnosis_status ?? null);
  const [diagnosedBy, setDiagnosedBy] = useState<DiagnosedBy | null>(profile?.diagnosed_by ?? null);
  const [diagnosedOn, setDiagnosedOn] = useState<string | null>(profile?.diagnosed_on ?? null);
  const text = useBlurSavedText(profile?.diagnosis_text, (value) => void save({ diagnosis_text: value }));
  const notes = useBlurSavedText(profile?.diagnosis_notes, (value) => void save({ diagnosis_notes: value }));

  return (
    <SettingsSection title={t('injuryInfo.diagnosisTitle')} footer={t('onboarding.diagnosisHint')} bare>
      <SingleSelectList
        options={DIAGNOSIS_STATUS_OPTIONS}
        value={status}
        onChange={(value) => {
          setStatus(value);
          void save({
            diagnosis_status: value,
            // Answering "yes" here also answers the Home care step.
            ...(value === 'yes' && profile?.care_status !== 'with_professional'
              ? { care_status: 'with_professional' as const, care_status_answered_at: new Date().toISOString() }
              : {}),
          });
        }}
      />
      {status === 'yes' && (
        <View className="gap-4">
          <View className="overflow-hidden rounded-[18px] bg-surface dark:bg-surfaceDark">
            <SettingsFieldRow
              label={t('injuryInfo.diagnosisName')}
              value={text.value}
              onChangeText={text.setValue}
              onBlur={text.flush}
              placeholder={t('onboarding.diagnosisTextPlaceholder')}
              maxLength={200}
            />
            <SettingsDateRow
              icon="calendar-outline"
              title={t('injuryInfo.diagnosedOn')}
              accessibilityName={t('injuryInfo.diagnosedOn')}
              value={diagnosedOn}
              placeholder={t('injuryInfo.setDate')}
              maximumDate={new Date()}
              onChange={(date) => {
                setDiagnosedOn(date);
                void save({ diagnosed_on: date });
              }}
              isLast
            />
          </View>
          <View className="gap-2">
            <Text className="px-1 text-[13px] font-semibold uppercase tracking-wide text-inkSecondary dark:text-gray">
              {t('onboarding.diagnosedByQuestion')}
            </Text>
            <MultiSelectChips
              options={DIAGNOSED_BY_OPTIONS}
              value={diagnosedBy ? [diagnosedBy] : []}
              onChange={(values) => {
                const next = (values.at(-1) as DiagnosedBy | undefined) ?? null;
                setDiagnosedBy(next);
                void save({ diagnosed_by: next });
              }}
            />
          </View>
          <SettingsTextArea
            value={notes.value}
            onChangeText={notes.setValue}
            onBlur={notes.flush}
            placeholder={t('onboarding.diagnosisNotesPlaceholder')}
            maxLength={DESCRIPTION_MAX_LENGTH}
          />
        </View>
      )}
    </SettingsSection>
  );
}

// Keyed by profile id from the parent so it mounts with the loaded values.
function InjuryInfoForm({ profile }: { profile: Profile | null }) {
  const { t } = useTranslation();
  const updateProfile = useUpdateProfile();
  const [injuryStartedOn, setInjuryStartedOn] = useState<string | null>(profile?.injury_started_on ?? null);
  // From a rough onboarding period ("a month ago"): shown as "about".
  const [startApprox, setStartApprox] = useState(profile?.injury_started_approx ?? false);
  const [healingStartedOn, setHealingStartedOn] = useState<string | null>(profile?.healing_started_on ?? null);
  const [description, setDescription] = useState(profile?.injury_description ?? '');
  const savedDescriptionRef = useRef(profile?.injury_description ?? '');
  const pendingDescriptionRef = useRef<string | null>(null);

  // Auto-save (no Save button, per the design). Errors toast; the local value
  // stays so nothing typed is lost.
  const save = async (updates: ProfileUpdate) => {
    const { error } = await updateProfile.mutateAsync(updates);
    if (error) toast.error(error);
    return !error;
  };

  const flushDescription = () => {
    const pending = pendingDescriptionRef.current;
    if (pending === null || pending === savedDescriptionRef.current) return;
    pendingDescriptionRef.current = null;
    savedDescriptionRef.current = pending;
    void save({ injury_description: pending.trim() || null });
  };

  // Debounced description save; the cleanup also flushes when leaving the page.
  useEffect(() => {
    if (description === savedDescriptionRef.current) return;
    pendingDescriptionRef.current = description;
    const timeout = setTimeout(flushDescription, DESCRIPTION_SAVE_DELAY_MS);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [description]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => () => flushDescription(), []);

  const today = new Date();

  return (
    <View className="gap-7">
      {healingStartedOn && <HealingHero healingStartedOn={healingStartedOn} />}

      <SettingsSection title={t('injuryInfo.datesTitle')} footer={t('injuryInfo.healingHint')}>
        <SettingsDateRow
          icon="flash-outline"
          title={t(startApprox ? 'injuryInfo.injuryHappenedApprox' : 'injuryInfo.injuryHappened')}
          accessibilityName={t('injuryInfo.injuryDateA11y')}
          iconTileClassName="bg-red-100 dark:bg-red-950"
          iconColor="#dc2626"
          value={injuryStartedOn}
          placeholder={t('injuryInfo.setDate')}
          maximumDate={today}
          onChange={(date) => {
            setInjuryStartedOn(date);
            setStartApprox(false);
            // Moving the injury past the healing start invalidates it ("yyyy-MM-dd" compares lexically).
            if (healingStartedOn && date > healingStartedOn) {
              setHealingStartedOn(null);
              void save({ injury_started_on: date, injury_started_approx: false, healing_started_on: null });
            } else {
              void save({ injury_started_on: date, injury_started_approx: false });
            }
          }}
        />
        <SettingsDateRow
          icon="leaf-outline"
          title={t('injuryInfo.healingStarted')}
          accessibilityName={t('injuryInfo.healingDateA11y')}
          value={healingStartedOn}
          placeholder={t('injuryInfo.setDate')}
          minimumDate={injuryStartedOn ? parseISO(injuryStartedOn) : undefined}
          maximumDate={today}
          onChange={(date) => {
            setHealingStartedOn(date);
            void save({ healing_started_on: date });
          }}
        />
      </SettingsSection>

      <DiagnosisCard profile={profile} save={save} />

      <SettingsSection title={t('injuryInfo.whatHappenedTitle')} bare>
        <SettingsTextArea
          value={description}
          onChangeText={setDescription}
          onBlur={flushDescription}
          placeholder={t('injuryInfo.whatHappenedPlaceholder')}
          maxLength={DESCRIPTION_MAX_LENGTH}
        />
        <View className="flex-row items-center gap-1.5 px-1">
          {updateProfile.isPending ? (
            <ActivityIndicator size="small" color={colors.gray} />
          ) : (
            <Ionicons name="checkmark" size={16} color={colors.strongGray} />
          )}
          <Text className="text-sm text-gray">
            {updateProfile.isPending ? t('injuryInfo.saving') : t('injuryInfo.autoSave')}
          </Text>
        </View>
      </SettingsSection>
    </View>
  );
}

// Settings → Injury info (design from assets/possible-app-design/injury).
// Pushed page like the other settings sub-pages (src/app/settings/).
export default function InjuryInfoScreen() {
  const keepFocusedVisible = useKeepFocusedInputVisible();
  const { profile, isLoading } = useProfile();

  return (
    <ScrollView
      {...keepFocusedVisible}
      className="flex-1 bg-background dark:bg-backgroundDark"
      contentContainerClassName="px-5 pb-12 pt-4"
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
      keyboardDismissMode="interactive"
    >
      {isLoading ? <ActivityIndicator /> : <InjuryInfoForm key={profile?.id ?? 'none'} profile={profile} />}
    </ScrollView>
  );
}
