import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { useState, type ReactNode } from 'react';

import { MultiSelectChips } from '@/components/onboarding/MultiSelectChips';
import { PainLocationsField } from '@/components/onboarding/PainLocationsField';
import { SingleSelectList } from '@/components/onboarding/SingleSelectList';
import { StartingPictureCards } from '@/components/onboarding/StartingPictureCards';
import {
  EXERCISE_FREQUENCY_OPTIONS,
  LIFE_STRESS_OPTIONS,
  PAIN_CHARACTER_OPTIONS,
  PURPOSE_OPTIONS,
  SUSPECTED_TRIGGER_OPTIONS,
  WORK_HOURS_OPTIONS,
  WORK_TYPE_OPTIONS,
  WORST_TIME_OF_DAY_OPTIONS,
} from '@/constants/onboarding';
import { useProfile, useUpdateProfile } from '@/hooks/useProfile';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { purposeOf } from '@/lib/profileAnswers';
import { buildStartingPicture } from '@/lib/startingPicture';
import type { Profile, ProfileUpdate } from '@/types/database.types';
import { toast } from '@/utils/toast';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="gap-3">
      <Text className="px-1 text-[13px] font-semibold uppercase tracking-wide text-inkSecondary dark:text-gray">
        {title}
      </Text>
      {children}
    </View>
  );
}

function Question({ children }: { children: ReactNode }) {
  return <Text className="px-1 text-[15px] font-medium text-ink dark:text-white">{children}</Text>;
}

// Keyed by profile id from the parent so it mounts with the loaded values.
function AboutMeForm({ profile }: { profile: Profile }) {
  const { t } = useTranslation();
  const updateProfile = useUpdateProfile();
  const [values, setValues] = useState<ProfileUpdate>({
    primary_goal: profile.primary_goal,
    pain_locations: profile.pain_locations ?? [],
    pain_character: profile.pain_character ?? [],
    work_type: profile.work_type ?? null,
    work_hours: profile.work_hours ?? null,
    life_stress: profile.life_stress ?? null,
    exercise_frequency: profile.exercise_frequency ?? null,
    suspected_triggers: profile.suspected_triggers ?? [],
    worst_time_of_day: profile.worst_time_of_day,
  });

  // Auto-save every change, like Injury info. On error the local value stays
  // and a toast explains.
  const change = (updates: ProfileUpdate) => {
    setValues((prev) => ({ ...prev, ...updates }));
    void updateProfile.mutateAsync(updates).then(({ error }) => {
      if (error) toast.error(error);
    });
  };

  const needsHours = values.work_type === 'sitting' || values.work_type === 'standing';
  const cards = buildStartingPicture({
    purpose: purposeOf(values.primary_goal),
    workType: values.work_type,
    workHours: values.work_hours,
    lifeStress: values.life_stress,
    suspectedTriggers: values.suspected_triggers,
    worstTimeOfDay: values.worst_time_of_day,
  });

  return (
    <View className="gap-8">
      <Section title={t('aboutMe.purposeTitle')}>
        <SingleSelectList
          options={PURPOSE_OPTIONS}
          value={PURPOSE_OPTIONS.some((o) => o.value === values.primary_goal) ? (values.primary_goal as never) : null}
          onChange={(v) => change({ primary_goal: v })}
        />
      </Section>

      <Section title={t('aboutMe.painTitle')}>
        <PainLocationsField value={values.pain_locations ?? []} onChange={(v) => change({ pain_locations: v })} />
        <Question>{t('onboarding.characterQuestion')}</Question>
        <MultiSelectChips
          options={PAIN_CHARACTER_OPTIONS}
          value={values.pain_character ?? []}
          onChange={(v) => change({ pain_character: v })}
          otherLabelKey="onboarding.characterOther"
        />
      </Section>

      <Section title={t('aboutMe.workTitle')}>
        <SingleSelectList
          options={WORK_TYPE_OPTIONS}
          value={values.work_type ?? null}
          onChange={(v) =>
            change({
              work_type: v,
              // Hours only apply to sitting or standing work.
              ...(v === 'sitting' || v === 'standing' ? {} : { work_hours: null }),
            })
          }
        />
        {needsHours && (
          <>
            <Question>
              {t(values.work_type === 'sitting' ? 'onboarding.hoursSitting' : 'onboarding.hoursStanding')}
            </Question>
            <SingleSelectList
              options={WORK_HOURS_OPTIONS}
              value={values.work_hours ?? null}
              onChange={(v) => change({ work_hours: v })}
            />
          </>
        )}
      </Section>

      <Section title={t('aboutMe.stressTitle')}>
        <Question>{t('onboarding.lifeStressQuestion')}</Question>
        <SingleSelectList
          options={LIFE_STRESS_OPTIONS}
          value={values.life_stress ?? null}
          onChange={(v) => change({ life_stress: v })}
        />
        <Question>{t('onboarding.exerciseQuestion')}</Question>
        <SingleSelectList
          options={EXERCISE_FREQUENCY_OPTIONS}
          value={values.exercise_frequency ?? null}
          onChange={(v) => change({ exercise_frequency: v })}
        />
      </Section>

      <Section title={t('aboutMe.hunchesTitle')}>
        <Question>{t('onboarding.hunchesQuestion')}</Question>
        <MultiSelectChips
          options={SUSPECTED_TRIGGER_OPTIONS}
          value={values.suspected_triggers ?? []}
          onChange={(v) =>
            change({
              suspected_triggers: v.at(-1) === 'dont_know' ? ['dont_know'] : v.filter((x) => x !== 'dont_know'),
            })
          }
        />
        <Question>{t('onboarding.worstTimeQuestion')}</Question>
        <SingleSelectList
          options={WORST_TIME_OF_DAY_OPTIONS}
          value={values.worst_time_of_day ?? null}
          onChange={(v) => change({ worst_time_of_day: v })}
        />
      </Section>

      <Section title={t('startingPicture.aboutMeTitle')}>
        <StartingPictureCards cards={cards} />
      </Section>
    </View>
  );
}

// Settings → Recovery → About me: the day-to-day questions from onboarding,
// editable any time (a job change, a skipped "Ask me later"). Saves on every
// change. The injury itself (dates, diagnosis) lives on Injury info.
export default function AboutMeScreen() {
  const { profile, isLoading } = useProfile();

  return (
    <ScrollView className="flex-1 bg-background dark:bg-backgroundDark" contentContainerClassName="px-5 pb-12 pt-4">
      {isLoading || !profile ? <ActivityIndicator /> : <AboutMeForm key={profile.id} profile={profile} />}
    </ScrollView>
  );
}
