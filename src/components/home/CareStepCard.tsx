import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { useJourney } from '@/hooks/useJourney';
import { useProfile, useUpdateProfile } from '@/hooks/useProfile';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { colors } from '@/lib/theme';
import type { CareStatus } from '@/types/database.types';
import { haptics } from '@/utils/haptics';
import { toast } from '@/utils/toast';

const ANSWERS: { status: CareStatus; labelKey: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { status: 'with_professional', labelKey: 'journey.careWithPro', icon: 'medkit-outline' },
  { status: 'not_yet', labelKey: 'journey.careNotYet', icon: 'help-circle-outline' },
  { status: 'just_tracking', labelKey: 'journey.careJustTracking', icon: 'book-outline' },
];

// The journey's day-7 care step: "Do you know what's causing your pain?".
// A Home card rather than a modal, so it can never interrupt or race
// navigation. The answer decides whether training & physio features show.
// Deliberately never suggests a diagnosis — "Not yet" points the user to a
// physio/doctor and their prepared summary instead (re-asked after 14 days).
export function CareStepCard() {
  const { t } = useTranslation();
  const router = useRouter();
  const { careStepDue } = useJourney();
  const { profile } = useProfile();
  const updateProfile = useUpdateProfile();
  const aiInsightsEnabled = profile?.ai_insights_enabled ?? true;
  const [saving, setSaving] = useState<CareStatus | null>(null);
  // Shown right after answering "Not yet", until dismissed — local only, the
  // question itself comes back after the re-ask window.
  const [showRecommendation, setShowRecommendation] = useState(false);

  const answer = async (status: CareStatus) => {
    haptics.tick();
    setSaving(status);
    const trainingChoice =
      status === 'with_professional' ? { training_enabled: true } : status === 'just_tracking' ? { training_enabled: false } : {};
    const { error } = await updateProfile.mutateAsync({
      care_status: status,
      care_status_answered_at: new Date().toISOString(),
      ...trainingChoice,
    });
    setSaving(null);
    if (error) {
      toast.error(error);
      return;
    }
    if (status === 'not_yet') setShowRecommendation(true);
    if (status === 'with_professional') toast.success(t('journey.careWithProToast'));
  };

  if (showRecommendation) {
    const href = (aiInsightsEnabled ? '/history/physio-summary' : '/(tabs)/history') as Href;
    return (
      <View className="gap-3 rounded-2xl bg-bone p-4 dark:bg-surfaceDark">
        <View className="flex-row items-start justify-between gap-3">
          <View className="flex-1 gap-1">
            <Text className="text-base font-semibold text-black dark:text-white">{t('journey.careRecommendTitle')}</Text>
            <Text className="text-sm text-strongGray dark:text-white">{t('journey.careRecommendBody')}</Text>
          </View>
          <Pressable
            onPress={() => setShowRecommendation(false)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={t('common.close')}
          >
            <Ionicons name="close" size={20} color={colors.gray} />
          </Pressable>
        </View>
        <Pressable
          onPress={() => {
            setShowRecommendation(false);
            router.push(href);
          }}
          className="items-center self-start rounded-lg bg-primary px-4 py-2 active:opacity-90 dark:bg-primaryDark"
        >
          <Text className="font-semibold text-white">
            {t(aiInsightsEnabled ? 'journey.careRecommendCta' : 'journey.careRecommendCtaNoAi')}
          </Text>
        </Pressable>
        <Text className="text-xs text-gray-500 dark:text-gray">{t('journey.careDisclaimer')}</Text>
      </View>
    );
  }

  if (!careStepDue) return null;

  return (
    <View className="gap-3 rounded-2xl bg-surface p-4 dark:bg-surfaceDark">
      <Text className="text-base font-semibold text-black dark:text-white">{t('journey.careQuestion')}</Text>
      <View className="gap-2">
        {ANSWERS.map((option) => (
          <Pressable
            key={option.status}
            onPress={() => answer(option.status)}
            disabled={saving !== null}
            accessibilityRole="button"
            className="flex-row items-center gap-3 rounded-lg bg-primaryMuted px-4 py-3 active:opacity-80 disabled:opacity-60 dark:bg-primaryMutedDark"
          >
            <Ionicons name={option.icon} size={18} color={colors.primary} />
            <Text className="flex-1 text-sm font-medium text-black dark:text-white">{t(option.labelKey)}</Text>
            {saving === option.status && <ActivityIndicator size="small" color={colors.primary} />}
          </Pressable>
        ))}
      </View>
      <Text className="text-xs text-gray-500 dark:text-gray">{t('journey.careDisclaimer')}</Text>
    </View>
  );
}
