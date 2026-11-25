import { AboutMeCard } from '@/components/home/AboutMeCard';
import { CareStepCard } from '@/components/home/CareStepCard';
import { CheckinStatusCard } from '@/components/home/CheckinStatusCard';
import { CheckinWeekCard } from '@/components/home/CheckinWeekCard';
import { DaysSinceHealing } from '@/components/home/DaysSinceHealing';
import { ExerciseWeekCalendar } from '@/components/home/ExerciseWeekCalendar';
import { JourneyCard } from '@/components/home/JourneyCard';
import { TodaysRoutineCard } from '@/components/home/TodaysRoutineCard';
import { LockedCard } from '@/components/premium/LockedCard';
import { WelcomeGuide } from '@/components/home/WelcomeGuide';
import { WrapReadyCard } from '@/components/home/WrapReadyCard';
import { AnimatedCheckmark } from '@/components/ui/AnimatedCheckmark';
import { useExerciseLogHistory } from '@/hooks/useExerciseLogs';
import { usePremium } from '@/hooks/usePremium';
import { useJourney } from '@/hooks/useJourney';
import { useProfile, useUpdateProfile } from '@/hooks/useProfile';
import { useSession } from '@/hooks/useSession';
import { useTodayStatus } from '@/hooks/useTodayStatus';
import { getNowAction, isMorningOptionalToday, type CheckinAction } from '@/lib/checkinTiming';
import { formatHeadingDate } from '@/lib/dates';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { colors } from '@/lib/theme';
import { weeklyTrainingProgress } from '@/lib/trainingInsights';
import { useJourneyStore } from '@/store/useJourneyStore';
import { useOnboardingCompleteStore } from '@/store/useOnboardingCompleteStore';
import { haptics } from '@/utils/haptics';
import { toast } from '@/utils/toast';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { Link, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useToday, useTodayStore } from '@/store/useTodayStore';

const POST_TRANSITION_DELAY_MS = 450;
const WELCOME_OPEN_DELAY_MS = 300;
// The guide's real <Modal> fades out before the check-in is pushed.
const NAVIGATE_AFTER_CLOSE_MS = 300;

export default function HomeScreen() {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  // New-user journey: training cards only appear once the user opts in (care
  // step / Settings) or already uses them — see lib/journey.ts.
  const { trainingEnabled, state: journeyState, isLoading: journeyLoading } = useJourney();
  const { profile } = useProfile();
  const [refreshing, setRefreshing] = useState(false);
  // TEMP long-press-the-title debug trigger for previewing the success
  // checkmark animation. Onboarding no longer plays it: it ended in two
  // closing moments (checkmark, then the welcome guide) and no action, so it
  // now goes straight into the guide, which leads into the first check-in.
  const [debugCheckmarkVisible, setDebugCheckmarkVisible] = useState(false);
  const closeCheckmark = () => setDebugCheckmarkVisible(false);
  useEffect(() => {
    if (debugCheckmarkVisible) haptics.success();
  }, [debugCheckmarkVisible]);

  // Full-screen "how this works", auto-opened on each account's first time
  // in the app (whatever its data). It collapses into the progress card,
  // which can reopen it, or ends on the check-in that's due now.
  // Straight after onboarding, Home lands via the root layout's fade, and a
  // real <Modal> presenting mid-transition is the documented
  // Modal-vs-navigation race (see ToastModalHost), so it waits for the fade.
  const onboardingJustCompleted = useOnboardingCompleteStore((s) => s.pending);
  const progressCardRef = useRef<View>(null);
  const { user } = useSession();
  const welcomeSeen = useJourneyStore((s) => !!user && s.welcomeSeenBy.includes(user.id));
  const [welcomeVisible, setWelcomeVisible] = useState(false);
  const [welcomeFromCard, setWelcomeFromCard] = useState(false);
  const shouldAutoOpenWelcome = !!user && !welcomeSeen && !journeyLoading && !debugCheckmarkVisible;

  useEffect(() => {
    if (!shouldAutoOpenWelcome) return;
    const delay = useOnboardingCompleteStore.getState().pending ? POST_TRANSITION_DELAY_MS : WELCOME_OPEN_DELAY_MS;
    const timeout = setTimeout(() => {
      useOnboardingCompleteStore.getState().consume();
      setWelcomeFromCard(false);
      setWelcomeVisible(true);
    }, delay);
    return () => clearTimeout(timeout);
  }, [shouldAutoOpenWelcome]);

  // Already-seen accounts never open the guide, so clear the flag here.
  useEffect(() => {
    if (onboardingJustCompleted && welcomeSeen) useOnboardingCompleteStore.getState().consume();
  }, [onboardingJustCompleted, welcomeSeen]);

  const { morningDone, eveningDone } = useTodayStatus();
  const clock = useTodayStore((s) => s.clock);
  const nowAction = getNowAction({ hour: new Date(clock).getHours(), morningDone, eveningDone });

  const closeWelcome = () => {
    setWelcomeVisible(false);
    if (user) useJourneyStore.getState().markWelcomeSeen(user.id);
  };
  const startCheckinFromWelcome = (action: CheckinAction) => {
    closeWelcome();
    setTimeout(() => router.push(`/checkin/${action}`), NAVIGATE_AFTER_CLOSE_MS);
  };

  // Routine-adherence weekly goal, not a generic "were you active today" —
  // a day counts only when the prescribed routine was actually logged (FULL
  // or PARTIAL), regardless of the evening check-in's separate, unrelated
  // `did_exercises` question. ~12 weeks fetched so weeks-in-a-row can count.
  const { isPremium } = usePremium();
  const { logs: exerciseLogs } = useExerciseLogHistory(84);
  const updateProfile = useUpdateProfile();
  const weeklyGoal = profile?.weekly_training_goal ?? 3;
  const today = useToday();
  const trainingProgress = useMemo(
    () => weeklyTrainingProgress(exerciseLogs, weeklyGoal, today),
    [exerciseLogs, weeklyGoal, today],
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
        {/* Date on its own line so it never wraps next to the (wider, oak +
            ring) healing chip, which shares the title's row. */}
        <View>
          <Text className="text-base text-strongGray dark:text-gray">{formatHeadingDate(new Date(), locale)}</Text>
          <View className="flex-row items-center justify-between gap-3">
            <Pressable onLongPress={() => setDebugCheckmarkVisible(true)} delayLongPress={400} className="flex-shrink">
              <Text className="text-4xl font-bold text-black dark:text-white">{t('home.title')}</Text>
            </Pressable>
            <DaysSinceHealing />
          </View>
        </View>

        {/* Order: today's job first, the flare-up button high (someone in a
            flare needs it fast, not after scrolling past stats), then
            temporary prompts, passive info, opt-in training, and the unlocks
            card last (JourneyCard renders nothing once everything is
            unlocked). The oak lives in the header's healing chip. */}
        <CheckinStatusCard />

        <Link href="/flare-up/new" asChild>
          <Pressable
            accessibilityRole="button"
            className="h-[54px] flex-row items-center justify-center gap-2 rounded-3xl border-2 border-red-200 bg-surface active:opacity-80 dark:border-red-900 dark:bg-surfaceDark"
          >
            <Ionicons name="flash-outline" size={22} color="#dc2626" />
            <Text className="text-lg font-bold text-red-700 dark:text-red-400">{t('home.logFlareUp')}</Text>
          </Pressable>
        </Link>

        <CareStepCard />
        <AboutMeCard />

        <WrapReadyCard />

        <CheckinWeekCard />

        {/* Routines + the weekly goal are Premium. Free users who turned
            training on get one locked card instead of the two. */}
        {trainingEnabled && !isPremium && <LockedCard feature="routines" />}

        {trainingEnabled && isPremium && <TodaysRoutineCard />}

        {trainingEnabled && isPremium && (
          <ExerciseWeekCalendar
            progress={trainingProgress}
            onChangeGoal={handleChangeGoal}
            onSelectDate={(date) => router.push(`/history/day/${date}`)}
          />
        )}

        <JourneyCard
          progressCardRef={progressCardRef}
          onOpenGuide={() => {
            setWelcomeFromCard(true);
            setWelcomeVisible(true);
          }}
        />

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
      <Modal transparent animationType="fade" visible={debugCheckmarkVisible} onRequestClose={closeCheckmark}>
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
        startWithEvening={isMorningOptionalToday({ hour: new Date(clock).getHours(), loggedDays: journeyState.loggedDays })}
        nowAction={nowAction}
        onClosed={closeWelcome}
        onStartCheckin={startCheckinFromWelcome}
      />
    </SafeAreaView>
  );
}
