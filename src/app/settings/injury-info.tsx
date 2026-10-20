import { Ionicons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';

import { SettingsDateRow } from '@/components/settings/SettingsDateRow';
import { SettingsSection } from '@/components/settings/SettingsSection';
import { SettingsTextArea } from '@/components/settings/SettingsTextArea';
import { useProfile, useUpdateProfile } from '@/hooks/useProfile';
import { currentDateFnsLocale, daysSince } from '@/lib/dates';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { colors } from '@/lib/theme';
import type { Profile, ProfileUpdate } from '@/types/database.types';
import { toast } from '@/utils/toast';

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

// Keyed by profile id from the parent so it mounts with the loaded values.
function InjuryInfoForm({ profile }: { profile: Profile | null }) {
  const { t } = useTranslation();
  const updateProfile = useUpdateProfile();
  const [injuryStartedOn, setInjuryStartedOn] = useState<string | null>(profile?.injury_started_on ?? null);
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
          title={t('injuryInfo.injuryHappened')}
          accessibilityName={t('injuryInfo.injuryDateA11y')}
          iconTileClassName="bg-red-100 dark:bg-red-950"
          iconColor="#dc2626"
          value={injuryStartedOn}
          placeholder={t('injuryInfo.setDate')}
          maximumDate={today}
          onChange={(date) => {
            setInjuryStartedOn(date);
            // Moving the injury past the healing start invalidates it ("yyyy-MM-dd" compares lexically).
            if (healingStartedOn && date > healingStartedOn) {
              setHealingStartedOn(null);
              void save({ injury_started_on: date, healing_started_on: null });
            } else {
              void save({ injury_started_on: date });
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
  const { profile, isLoading } = useProfile();

  return (
    <ScrollView
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
