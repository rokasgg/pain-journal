import { CheckinStatusCard } from '@/components/home/CheckinStatusCard';
import { DaysSinceHealing } from '@/components/home/DaysSinceHealing';
import { ExerciseWeekCalendar } from '@/components/home/ExerciseWeekCalendar';
import { FlowerHealthCard } from '@/components/home/FlowerHealthCard';
import { AnimatedCheckmark } from '@/components/ui/AnimatedCheckmark';
import { useCheckinHistory } from '@/hooks/useCheckins';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { colors } from '@/lib/theme';
import { useOnboardingCompleteStore } from '@/store/useOnboardingCompleteStore';
import { useQueryClient } from '@tanstack/react-query';
import { Link, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Modal, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  // Real trigger: shown once right after onboarding finishes (set by
  // onboarding.tsx via useOnboardingCompleteStore, read directly here rather
  // than mirrored into local state) — plus a TEMP long-press-the-title debug
  // trigger for previewing the animation without going through onboarding.
  // Remove the debug path once the animation's been checked on-device.
  const onboardingJustCompleted = useOnboardingCompleteStore((s) => s.pending);
  const consumeOnboardingCompletion = useOnboardingCompleteStore((s) => s.consume);
  const [debugCheckmarkVisible, setDebugCheckmarkVisible] = useState(false);

  const checkmarkVisible = onboardingJustCompleted || debugCheckmarkVisible;
  const closeCheckmark = () => {
    if (onboardingJustCompleted) consumeOnboardingCompletion();
    setDebugCheckmarkVisible(false);
  };

  const { checkins } = useCheckinHistory(7);
  const exercisedDates = useMemo(
    () =>
      new Set(
        checkins.filter((c) => c.type === 'evening' && c.did_exercises).map((c) => c.checkin_date),
      ),
    [checkins],
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await queryClient.refetchQueries({
      predicate: (query) =>
        ['profile', 'checkins', 'flareUps', 'physioAssessments'].includes(query.queryKey[0] as string),
    });
    setRefreshing(false);
  };

  return (
    <SafeAreaView className="flex-1 bg-background dark:bg-backgroundDark" edges={['top']}>
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-6 px-6 py-8"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        <View className="flex-row items-start justify-between">
          <Pressable onLongPress={() => setDebugCheckmarkVisible(true)} delayLongPress={400}>
            <Text className="text-2xl font-bold text-black dark:text-white">{t('home.title')}</Text>
            <Text className="text-sm text-gray-500 dark:text-gray">
              {t('home.subtitle')}
            </Text>
          </Pressable>
          <View className="items-end gap-2">
            {/* <DaysSinceInjury /> */}
            <DaysSinceHealing />
          </View>
        </View>

        <FlowerHealthCard />

        <CheckinStatusCard />

        <Link href="/flare-up/new" asChild>
          <Pressable className="items-center rounded-xl justify-center bg-primary h-16 py-3 dark:bg-primaryDark active:opacity-90">
            <Text className="font-medium text-white text-lg">{t('home.logFlareUp')}</Text>
          </Pressable>
        </Link>

        <View className="gap-3">

          <ExerciseWeekCalendar
            exercisedDates={exercisedDates}
            onSelectDate={(date) => router.push(`/history/day/${date}`)}
          />
        </View>


        {/*
        <Link href="/checkin/backfill" asChild>
          <Pressable className="items-center py-1 rounded-xl justify-center h-16">
            <Text className=" font-medium text-primary dark:text-primaryDark text-lg">
              {t('home.backfillDay')}
            </Text>
          </Pressable>
        </Link> */}
      </ScrollView>

      {/* Modal (not an in-tree absolute View) so this covers the bottom tab
          bar too — the tab bar is a sibling outside this screen's own view
          tree, rendered by the (tabs) Tabs navigator, so a plain absolute
          overlay here would stop above it. */}
      <Modal transparent animationType="fade" visible={checkmarkVisible} onRequestClose={closeCheckmark}>
        <Pressable onPress={closeCheckmark} className="flex-1 items-center justify-center bg-black/40">
          <AnimatedCheckmark
            size={112}
            color={colors.white}
            fillColor={colors.primary}
            strokeWidth={4}
            onAnimationComplete={closeCheckmark}
          />
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
