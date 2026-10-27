import { Ionicons } from '@expo/vector-icons';
import { format, isToday, isYesterday, parseISO } from 'date-fns';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, useColorScheme, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PillChip } from '@/components/flareup/ChoiceChips';
import { SectionTitle } from '@/components/ui/SectionTitle';
import { PAIN_AREA_LABEL_KEYS, TRIGGER_LABEL_KEYS } from '@/constants/symptoms';
import { useUpdateFlareUp } from '@/hooks/useFlareUps';
import { formatShortDayLabel, minutesSince } from '@/lib/dates';
import { END_WINDOWS, estimatedDurationMinutes, formatElapsed, type EndWindow } from '@/lib/flareFollowUp';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { colors } from '@/lib/theme';
import type { FlareUp } from '@/types/database.types';
import { haptics } from '@/utils/haptics';
import { toast } from '@/utils/toast';

export interface FlareUpFollowUpStepProps {
  flareUp: FlareUp;
  onDone: () => void;
}

type Choice = 'resolved' | 'ongoing';

const WINDOW_LABEL_KEYS: Record<EndWindow, string> = {
  evening: 'flareUp.followUp.whenEvening',
  night: 'flareUp.followUp.whenNight',
  morning: 'flareUp.followUp.whenMorning',
  unknown: 'flareUp.followUp.whenUnknown',
};

// One answer card of the radio group ("Praėjo" / "Dar tęsiasi"). The selected
// look is applied through `style` (and an always-rendered ✓ layer), so
// choosing never swaps classNames on a mounted element.
function ChoiceCard({
  title,
  hint,
  icon,
  iconColor,
  tileClassName,
  selected,
  onPress,
}: {
  title: string;
  hint: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  tileClassName: string;
  selected: boolean;
  onPress: () => void;
}) {
  const isDark = useColorScheme() === 'dark';
  const accent = isDark ? colors.primaryDark : colors.accent;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={`${title}. ${hint}`}
      className="flex-row items-center gap-3 rounded-2xl border-2 bg-surface p-3.5 active:opacity-80 dark:bg-surfaceDark"
      style={{ borderColor: selected ? accent : 'transparent' }}
    >
      <View className={`h-10 w-10 items-center justify-center rounded-xl ${tileClassName}`}>
        <Ionicons name={icon} size={22} color={iconColor} />
      </View>
      <View className="flex-1 gap-0.5">
        <Text className="text-heading text-ink dark:text-white">{title}</Text>
        <Text className="text-caption text-inkSecondary dark:text-gray">{hint}</Text>
      </View>
      <View className="h-6 w-6 items-center justify-center rounded-full border-2 border-[#C9D2CC] dark:border-borderDark">
        <View
          className="absolute -inset-0.5 items-center justify-center rounded-full"
          style={{ backgroundColor: accent, opacity: selected ? 1 : 0 }}
        >
          <Ionicons name="checkmark" size={14} color={colors.white} />
        </View>
      </View>
    </Pressable>
  );
}

// Morning check-in pre-step for a flare-up from the last few days that is
// still "ongoing"/"unknown" (design: assets/possible-app-design/
// check-in-morning/flare.html, "Ar jis dar tęsiasi?"): a summary of the
// flare-up, "Praėjo" / "Dar tęsiasi", and — for "Praėjo" — roughly when it
// ended. "Toliau" saves the answer; "Atsakysiu vėliau" leaves the flare-up
// untouched (asked again next morning). Neither answer is preselected, so
// continuing never marks a flare-up over by accident.
export function FlareUpFollowUpStep({ flareUp, onDone }: FlareUpFollowUpStepProps) {
  const { t, locale } = useTranslation();
  const isDark = useColorScheme() === 'dark';
  const insets = useSafeAreaInsets();
  const updateFlareUp = useUpdateFlareUp();
  const [choice, setChoice] = useState<Choice | null>(null);
  const [endWindow, setEndWindow] = useState<EndWindow | null>(null);

  const occurred = parseISO(flareUp.occurred_at);
  const dayLabel = isToday(occurred)
    ? t('flareUp.today')
    : isYesterday(occurred)
      ? t('flareUp.yesterday')
      : formatShortDayLabel(occurred, locale);
  const label = (keys: Record<string, string>, value: string) => (keys[value] ? t(keys[value]) : value);
  const areas = (flareUp.pain_areas ?? []).map((value) => label(PAIN_AREA_LABEL_KEYS, value)).join(', ');
  // Older rows only have the single likely_cause text.
  const causes = flareUp.triggers?.length
    ? flareUp.triggers.map((value) => label(TRIGGER_LABEL_KEYS, value)).join(', ')
    : (flareUp.likely_cause ?? '').trim();
  const lasting = formatElapsed(minutesSince(flareUp.occurred_at), {
    minutes: t('checkin.unitMinutes'),
    hours: t('checkin.unitHours'),
    days: t('flareUp.followUp.unitDays'),
  });
  const brown = isDark ? '#E3A584' : '#8F4A2A';
  const isSaving = updateFlareUp.isPending;

  const handleContinue = async () => {
    if (!choice) return;
    const result =
      choice === 'resolved'
        ? await updateFlareUp.mutateAsync({
            id: flareUp.id,
            status: 'resolved',
            resolved_duration_minutes: endWindow ? estimatedDurationMinutes(endWindow, occurred, new Date()) : null,
          })
        : await updateFlareUp.mutateAsync({ id: flareUp.id, status: 'ongoing' });
    if (result.error) {
      // Don't lose the answer: stay on this step.
      haptics.error();
      toast.error(result.error);
      return;
    }
    onDone();
  };

  return (
    <View className="flex-1">
      <ScrollView className="flex-1" contentContainerClassName="gap-5 px-5 pb-8 pt-5" keyboardShouldPersistTaps="handled">
        <View className="gap-1.5">
          <Text className="text-caption font-semibold uppercase tracking-wide" style={{ color: brown }}>
            {t(isYesterday(occurred) ? 'flareUp.followUp.eyebrowYesterday' : 'flareUp.followUp.eyebrowEarlier')}
          </Text>
          <Text className="text-title text-ink dark:text-white">{t('flareUp.followUp.title')}</Text>
        </View>

        <View className="flex-row items-start gap-3 rounded-2xl bg-surface p-3.5 dark:bg-surfaceDark">
          <View
            accessible
            accessibilityLabel={t('flareUp.followUp.painA11y', { pain: flareUp.pain_level })}
            className="h-11 w-11 items-center justify-center rounded-xl bg-[#FCEBD8] dark:bg-[#3A2A1E]"
          >
            <Text className="text-title" style={{ color: brown }}>
              {flareUp.pain_level}
            </Text>
          </View>
          <View className="flex-1 gap-1">
            <Text className="text-heading text-ink dark:text-white">{`${dayLabel}, ${format(occurred, 'HH:mm')}`}</Text>
            {areas !== '' && <Text className="text-label text-inkSecondary dark:text-gray">{areas}</Text>}
            {causes !== '' && (
              <Text className="text-caption text-inkSecondary dark:text-gray">
                {t('flareUp.followUp.cause', { cause: causes })}
              </Text>
            )}
          </View>
          <View className="rounded-lg bg-[#FCEBD8] px-2 py-1 dark:bg-[#3A2A1E]">
            <Text className="text-caption font-semibold" style={{ color: brown }}>
              {t('flareUp.followUp.lasting', { duration: lasting })}
            </Text>
          </View>
        </View>

        <View accessibilityRole="radiogroup" accessibilityLabel={t('flareUp.followUp.title')} className="gap-2">
          <ChoiceCard
            title={t('flareUp.followUp.optionResolved')}
            hint={t('flareUp.followUp.optionResolvedHint')}
            icon="sunny-outline"
            iconColor={isDark ? colors.primaryDark : colors.accent}
            tileClassName="bg-accentMuted dark:bg-segmentTrackDark"
            selected={choice === 'resolved'}
            onPress={() => {
              haptics.tick();
              setChoice('resolved');
            }}
          />
          <ChoiceCard
            title={t('flareUp.followUp.optionOngoing')}
            hint={t('flareUp.followUp.optionOngoingHint')}
            icon="flash-outline"
            iconColor={brown}
            tileClassName="bg-[#FCEBD8] dark:bg-[#3A2A1E]"
            selected={choice === 'ongoing'}
            onPress={() => {
              haptics.tick();
              setChoice('ongoing');
            }}
          />
        </View>

        {choice === 'resolved' && (
          <View className="gap-3">
            <SectionTitle title={t('flareUp.followUp.whenQuestion')} />
            <View className="flex-row flex-wrap gap-2.5">
              {END_WINDOWS.map((window) => (
                <PillChip
                  key={window}
                  label={t(WINDOW_LABEL_KEYS[window])}
                  selected={endWindow === window}
                  showCheck
                  onPress={() => {
                    haptics.tick();
                    setEndWindow(endWindow === window ? null : window);
                  }}
                />
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      <View
        className="border-t border-borderLight bg-background px-5 pt-3 dark:border-borderDark dark:bg-backgroundDark"
        style={{ paddingBottom: Math.max(insets.bottom, 12) }}
      >
        <Pressable
          onPress={handleContinue}
          disabled={!choice || isSaving}
          accessibilityRole="button"
          className="h-14 items-center justify-center rounded-2xl bg-accent dark:bg-primaryDark"
          style={{ opacity: !choice || isSaving ? 0.4 : 1 }}
        >
          {isSaving ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text className="text-nav text-white">{t('common.next')}</Text>
          )}
        </Pressable>
        <Pressable
          onPress={onDone}
          disabled={isSaving}
          accessibilityRole="button"
          className="h-11 items-center justify-center active:opacity-60"
        >
          <Text className="text-label font-semibold text-accent dark:text-primaryDark">
            {t('flareUp.followUp.later')}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
