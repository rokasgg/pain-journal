import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import { useEffect, type RefObject } from 'react';
import { Pressable, Text, View } from 'react-native';

import { GlowPulse } from '@/components/ui/GlowPulse';
import { useJourney } from '@/hooks/useJourney';
import { useProfile } from '@/hooks/useProfile';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { JOURNEY_MILESTONES, type MilestoneKey } from '@/lib/journey';
import { colors } from '@/lib/theme';
import { useJourneyStore } from '@/store/useJourneyStore';
import { haptics } from '@/utils/haptics';

export const MILESTONE_LABEL_KEYS: Record<MilestoneKey, string> = {
  history: 'journey.featureHistory',
  insights: 'journey.featureInsights',
  careStep: 'journey.featureCareStep',
  reports: 'journey.featureReports',
};

// Milestones that get a one-time "✨ New" card. The care step is its own
// card (CareStepCard), so it's never announced here.
const ANNOUNCED_MILESTONES: { key: MilestoneKey; bodyKey: string; href: Href }[] = [
  { key: 'history', bodyKey: 'journey.newHistory', href: '/(tabs)/history' as Href },
  { key: 'insights', bodyKey: 'journey.newInsights', href: '/(tabs)/insights' as Href },
  { key: 'reports', bodyKey: 'journey.newReports', href: '/(tabs)/insights' as Href },
];

// Locked milestones shown as progress bars (the care step unlocks with
// Insights, so it isn't a separate bar).
const PROGRESS_MILESTONES = JOURNEY_MILESTONES.filter((m) => m.key !== 'careStep');
const MAX_PROGRESS_ROWS = 2;

function ProgressBar({ value, total }: { value: number; total: number }) {
  const pct = Math.min(value / total, 1) * 100;
  return (
    <View className="h-1.5 flex-1 overflow-hidden rounded-full bg-primaryMuted dark:bg-primaryMutedDark">
      <View className="h-full rounded-full bg-primary dark:bg-primaryDark" style={{ width: `${pct}%` }} />
    </View>
  );
}

export interface JourneyCardProps {
  // The compact progress card is the full-screen WelcomeGuide's collapse
  // target, so Home needs to measure it.
  progressCardRef: RefObject<View | null>;
  onOpenGuide: () => void;
}

// The new-user journey's Home card:
//  - a newly reached milestone → a one-time, glowing "✨ New: …" card;
//  - otherwise → compact "Your unlocks" progress bars (tap to reopen the
//    full-screen "how it works" guide, which collapses into this card);
// and nothing once everything is unlocked and announced.
export function JourneyCard({ progressCardRef, onOpenGuide }: JourneyCardProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const { state, isLoading } = useJourney();
  const { profile } = useProfile();
  const aiInsightsEnabled = profile?.ai_insights_enabled ?? true;
  const initialized = useJourneyStore((s) => s.initialized);
  const announced = useJourneyStore((s) => s.announced);

  // First run on this device: whatever is already unlocked counts as
  // announced, so existing users don't get "New!" cards for old features.
  useEffect(() => {
    if (!isLoading && !initialized) useJourneyStore.getState().initialize([...state.unlocked]);
  }, [isLoading, initialized, state]);

  const pending = initialized
    ? ANNOUNCED_MILESTONES.find((m) => state.unlocked.has(m.key) && !announced.includes(m.key))
    : undefined;

  useEffect(() => {
    if (pending) haptics.success();
  }, [pending]);

  if (isLoading || !initialized) return null;

  if (pending) {
    const dismiss = () => useJourneyStore.getState().markAnnounced(pending.key);
    const body = pending.key === 'reports' && !aiInsightsEnabled ? 'journey.newReportsNoAi' : pending.bodyKey;
    const href = pending.key === 'reports' && !aiInsightsEnabled ? ('/(tabs)/history' as Href) : pending.href;
    return (
      <GlowPulse active>
        <View className="gap-3 rounded-2xl bg-primary p-4 dark:bg-primaryDark">
          <View className="flex-row items-start justify-between gap-3">
            <View className="flex-1 gap-1">
              <Text className="text-base font-bold text-white">
                ✨ {t('journey.newTitle', { feature: t(MILESTONE_LABEL_KEYS[pending.key]) })}
              </Text>
              <Text className="text-sm text-white/90">{t(body)}</Text>
            </View>
            <Pressable onPress={dismiss} hitSlop={10} accessibilityRole="button" accessibilityLabel={t('common.close')}>
              <Ionicons name="close" size={20} color={colors.white} />
            </Pressable>
          </View>
          <Pressable
            onPress={() => {
              dismiss();
              router.navigate(href);
            }}
            className="items-center self-start rounded-lg bg-white/20 px-4 py-2 active:opacity-80"
          >
            <Text className="font-semibold text-white">{t('journey.open')}</Text>
          </Pressable>
        </View>
      </GlowPulse>
    );
  }

  const locked = PROGRESS_MILESTONES.filter((m) => !state.unlocked.has(m.key)).slice(0, MAX_PROGRESS_ROWS);
  if (locked.length === 0) return null;

  return (
    <Pressable
      ref={progressCardRef}
      onPress={onOpenGuide}
      accessibilityRole="button"
      accessibilityHint={t('journey.howTitle')}
      className="gap-3 rounded-2xl bg-surface p-4 active:opacity-80 dark:bg-surfaceDark"
    >
      <View className="flex-row items-center justify-between">
        <Text className="text-xs font-semibold uppercase text-gray-500 dark:text-gray">{t('journey.unlocksTitle')}</Text>
        <Ionicons name="information-circle-outline" size={18} color={colors.gray} />
      </View>
      {locked.map((milestone) => (
        <View key={milestone.key} className="flex-row items-center gap-3">
          <Ionicons name="lock-closed" size={14} color={colors.gray} />
          <Text className="w-20 text-sm font-medium text-strongGray dark:text-white">
            {t(MILESTONE_LABEL_KEYS[milestone.key])}
          </Text>
          <ProgressBar value={state.loggedDays} total={milestone.days} />
          <Text className="w-16 text-right text-xs text-gray-500 dark:text-gray">
            {t('journey.unlockProgress', { done: Math.min(state.loggedDays, milestone.days), total: milestone.days })}
          </Text>
        </View>
      ))}
    </Pressable>
  );
}
