import { CareStepCard } from '@/components/home/CareStepCard';
import { CheckinStatusCard } from '@/components/home/CheckinStatusCard';
import { DaysSinceHealing } from '@/components/home/DaysSinceHealing';
import { ExerciseWeekCalendar } from '@/components/home/ExerciseWeekCalendar';
import { FlowerHealthCard } from '@/components/home/FlowerHealthCard';
import { JourneyCard } from '@/components/home/JourneyCard';
import { WelcomeGuide } from '@/components/home/WelcomeGuide';
import { TodaysRoutineCard } from '@/components/home/TodaysRoutineCard';
import { WrapReadyCard } from '@/components/home/WrapReadyCard';
import { AnimatedCheckmark } from '@/components/ui/AnimatedCheckmark';
import { useExerciseLogHistory } from '@/hooks/useExerciseLogs';
import { useJourney } from '@/hooks/useJourney';
import { useSession } from '@/hooks/useSession';
import { useProfile, useUpdateProfile } from '@/hooks/useProfile';
import { todayLocalDate } from '@/lib/dates';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { colors } from '@/lib/theme';
import { weeklyTrainingProgress } from '@/lib/trainingInsights';
import { isMorningOptionalToday } from '@/lib/checkinTiming';
import { useJourneyStore } from '@/store/useJourneyStore';
import { useOnboardingCompleteStore } from '@/store/useOnboardingCompleteStore';
import { haptics } from '@/utils/haptics';
import { toast } from '@/utils/toast';
import { useQueryClient } from '@tanstack/react-query';
import { Link, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const POST_TRANSITION_DELAY_MS = 450;
const WELCOME_OPEN_DELAY_MS = 300;

export default function HomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  // New-user journey: training cards only appear once the user opts in (care
  // step / Settings) or already uses them — see lib/journey.ts.
  const { trainingEnabled, state: journeyState, isLoading: journeyLoading } = useJourney();
  const { profile } = useProfile();
  const [refreshing, setRefreshing] = useState(false);
  // Real trigger: shown once right after onboarding finishes (set by
  // onboarding.tsx via useOnboardingCompleteStore, read directly here rather
  // than mirrored into local state) — plus a TEMP long-press-the-title debug
  // trigger for previewing the animation without going through onboarding.
  // Remove the debug path once the animation's been checked on-device.
  const onboardingJustCompleted = useOnboardingCompleteStore((s) => s.pending);
  const consumeOnboardingCompletion = useOnboardingCompleteStore((s) => s.consume);
  const [debugCheckmarkVisible, setDebugCheckmarkVisible] = useState(false);
  // Home lands here via the root layout's fade from onboarding — presenting a
  // real <Modal> mid-transition is the documented Modal-vs-navigation race
  // (see ToastModalHost), so wait for the fade to finish first.
  const [checkmarkReady, setCheckmarkReady] = useState(false);
  useEffect(() => {
    if (!onboardingJustCompleted) return;
    const timeout = setTimeout(() => setCheckmarkReady(true), POST_TRANSITION_DELAY_MS);
    return () => clearTimeout(timeout);
  }, [onboardingJustCompleted]);

  const checkmarkVisible = (onboardingJustCompleted && checkmarkReady) || debugCheckmarkVisible;
  useEffect(() => {
    if (checkmarkVisible) haptics.success();
  }, [checkmarkVisible]);
  const closeCheckmark = () => {
    if (onboardingJustCompleted) consumeOnboardingCompletion();
    setDebugCheckmarkVisible(false);
  };

  // Full-screen "how this works", auto-opened on each account's first time
  // in the app (whatever its data), only once no onboarding checkmark is
  // pending/showing — so the order is Home → checkmark → welcome, and a
  // Modal never opens mid-transition. It collapses into the progress card,
  // which can reopen it.
  const progressCardRef = useRef<View>(null);
  const { user } = useSession();
  const welcomeSeen = useJourneyStore((s) => !!user && s.welcomeSeenBy.includes(user.id));
  const [welcomeVisible, setWelcomeVisible] = useState(false);
  const [welcomeFromCard, setWelcomeFromCard] = useState(false);
  const shouldAutoOpenWelcome =
    !!user && !welcomeSeen && !journeyLoading && !checkmarkVisible && !onboardingJustCompleted;

  useEffect(() => {
    if (!shouldAutoOpenWelcome) return;
    const timeout = setTimeout(() => {
      setWelcomeFromCard(false);
      setWelcomeVisible(true);
    }, WELCOME_OPEN_DELAY_MS);
    return () => clearTimeout(timeout);
  }, [shouldAutoOpenWelcome]);

  const closeWelcome = () => {
    setWelcomeVisible(false);
    if (user) useJourneyStore.getState().markWelcomeSeen(user.id);
  };

  // Routine-adherence weekly goal, not a generic "were you active today" —
  // a day counts only when the prescribed routine was actually logged (FULL
  // or PARTIAL), regardless of the evening check-in's separate, unrelated
  // `did_exercises` question. ~12 weeks fetched so weeks-in-a-row can count.
  const { logs: exerciseLogs } = useExerciseLogHistory(84);
  const updateProfile = useUpdateProfile();
  const weeklyGoal = profile?.weekly_training_goal ?? 3;
  const trainingProgress = useMemo(
    () => weeklyTrainingProgress(exerciseLogs, weeklyGoal, todayLocalDate()),
    [exerciseLogs, weeklyGoal],
  );
  const handleChangeGoal = async (goal: number) => {
    const { error } = await updateProfile.mutateAsync({ weekly_training_goal: goal });
    if (error) toast.error(error);
  };

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

        <JourneyCard
          progressCardRef={progressCardRef}
          onOpenGuide={() => {
            setWelcomeFromCard(true);
            setWelcomeVisible(true);
          }}
        />

        <CareStepCard />

        <WrapReadyCard />

        <FlowerHealthCard />

        <CheckinStatusCard />

        {trainingEnabled && <TodaysRoutineCard />}

        <Link href="/flare-up/new" asChild>
          <Pressable className="items-center rounded-xl justify-center bg-primary h-16 py-3 dark:bg-primaryDark active:opacity-90">
            <Text className="font-medium text-white text-lg">{t('home.logFlareUp')}</Text>
          </Pressable>
        </Link>

        {trainingEnabled && (
          <View className="gap-3">

            <ExerciseWeekCalendar
              progress={trainingProgress}
              onChangeGoal={handleChangeGoal}
              onSelectDate={(date) => router.push(`/history/day/${date}`)}
            />
          </View>
        )}


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

      <WelcomeGuide
        visible={welcomeVisible}
        targetRef={progressCardRef}
        expandFromTarget={welcomeFromCard}
        startWithEvening={isMorningOptionalToday({ hour: new Date().getHours(), loggedDays: journeyState.loggedDays })}
        onClosed={closeWelcome}
      />
    </SafeAreaView>
  );
}
