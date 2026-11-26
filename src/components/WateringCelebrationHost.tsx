import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, useColorScheme, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeOut, useReducedMotion, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { CheckinSkyScene, useSkyColor, type SkyVariant } from '@/components/oak/CheckinSkyScene';
import { FALLBACK_OAK_STAGE } from '@/components/oak/oakConfig';
import { useReminderSettings, useUpdateReminderSettings } from '@/hooks/useReminderSettings';
import { EVENING_UNLOCK_HOUR } from '@/lib/checkinTiming';
import type { CelebratedUnlock, CelebrationProgress, CheckinCelebration } from '@/lib/checkinCelebration';
import { formatDayCount, pluralCategory } from '@/lib/i18n/plural';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { OAK_STAGE_NAME_KEYS } from '@/lib/oak';
import { colors } from '@/lib/theme';
import { hourToTime } from '@/lib/time';
import { CELEBRATION_PEAK_MS, useCelebrationStore } from '@/store/useCelebrationStore';
import { haptics } from '@/utils/haptics';
import {
  DEFAULT_EVENING_REMINDER,
  DEFAULT_MORNING_REMINDER,
  requestNotificationPermission,
} from '@/utils/notifications';
import { sounds } from '@/utils/sounds';

// The sequence after the sky moment peaks (CheckinSkyScene). Each phase reveals one more thing, so
// the moment builds up instead of arriving all at once.
const Phase = {
  Rising: 0, // the sun or moon is on its way
  Landed: 1, // sun/moon in place, chime, headline
  Grown: 2, // milestone growth + leaf burst, the day counter appears
  Counted: 3, // the day number ticks up, the new bar segment fills
  Done: 4, // Continue appears
} as const;
type PhaseValue = (typeof Phase)[keyof typeof Phase];
const PHASE_AT_MS = {
  landed: CELEBRATION_PEAK_MS,
  grown: CELEBRATION_PEAK_MS + 400,
  counted: CELEBRATION_PEAK_MS + 900,
  done: CELEBRATION_PEAK_MS + 1400,
};

const SUB_LINE_KEYS = [
  'celebration.sub1',
  'celebration.sub2',
  'celebration.sub3',
  'celebration.sub4',
  'celebration.sub5',
] as const;

const UNLOCK_KEYS: Record<CelebratedUnlock, string> = {
  history: 'celebration.unlockedHistory',
  insights: 'celebration.unlockedInsights',
  reports: 'celebration.unlockedReports',
};
// Whole keys rather than a {{feature}} slot: Lithuanian needs the feature
// name in the genitive ("Iki Istorijos").
const NEXT_KEYS: Record<CelebratedUnlock, string> = {
  history: 'celebration.nextHistory',
  insights: 'celebration.nextInsights',
  reports: 'celebration.nextReports',
};

// One segment per required day. Stable classes on every segment; the fill is
// a separate layer mounted inside it (never a className swap: see the
// NativeWind remount gotcha in CLAUDE.md). The newly earned segment's fill
// mounts at Phase.Counted with a pop.
function SegmentBar({
  total,
  filled,
  newIndex,
  showNew,
}: {
  total: number;
  filled: number;
  newIndex: number | null;
  showNew: boolean;
}) {
  return (
    <View className="flex-row gap-1.5">
      {Array.from({ length: total }, (_, index) => {
        const isNew = index === newIndex;
        const isFilled = index < filled && (!isNew || showNew);
        return (
          <View key={index} className="h-2.5 flex-1 overflow-hidden rounded-full bg-borderLight dark:bg-borderDark">
            {isFilled &&
              (isNew ? (
                <Animated.View
                  entering={ZoomIn.springify().damping(12)}
                  className="flex-1 rounded-full bg-primary dark:bg-primaryDark"
                />
              ) : (
                <View className="flex-1 rounded-full bg-primary dark:bg-primaryDark" />
              ))}
          </View>
        );
      })}
    </View>
  );
}

// Stat block colours. The label is darker than the subtitle's
// grey so it keeps ≥4.5:1 contrast on the evening sky; the status green is
// the Continue button's, lightened in dark mode for contrast on the night sky.
const STAT_GREEN = colors.primary;
const STAT_GREEN_DARK = '#8DBB97';

// The next-unlock bar, card-less, under the stat block (only while an unlock is left).
function NextUnlockRow({ progress, phase }: { progress: CelebrationProgress; phase: PhaseValue }) {
  const { t, locale } = useTranslation();
  const next = progress.next;
  if (!next) return null;
  return (
    <Animated.View entering={FadeInDown.duration(350)} className="w-full gap-2">
      <SegmentBar
        total={next.days}
        filled={progress.daysAfter}
        newIndex={progress.isNewDay ? progress.daysBefore : null}
        showNew={phase >= Phase.Counted}
      />
      <View className="flex-row items-center justify-between">
        <Text className="text-label font-semibold text-black dark:text-white">
          {t(NEXT_KEYS[next.key], { days: formatDayCount(next.daysRemaining, locale) })}
        </Text>
        <Text className="text-label text-[#5C5C66] dark:text-[#B4B6C8]">
          {t('journey.sheet.progressLabel', { done: progress.daysAfter, total: next.days })}
        </Text>
      </View>
    </Animated.View>
  );
}

// The card-less stat block directly under the subtitle, on every check-in
// complete screen (morning, evening, day complete): the big day count (it
// pops up by one on a new day), "days logged", and, when this day was
// already counted, a green "This day already counts" line.
function DayStats({ progress, phase }: { progress: CelebrationProgress; phase: PhaseValue }) {
  const { t, locale } = useTranslation();
  const dark = useColorScheme() === 'dark';
  const counted = phase >= Phase.Counted;
  const shownDays = progress.isNewDay && !counted ? progress.daysBefore : progress.daysAfter;
  const category = pluralCategory(shownDays, locale);
  const green = dark ? STAT_GREEN_DARK : STAT_GREEN;

  return (
    <Animated.View entering={FadeInDown.duration(350)} className="items-center" style={{ marginTop: 36 }}>
      <View
        accessible
        accessibilityLabel={t(`celebration.daysLoggedA11y.${category}`, { count: shownDays })}
        className="items-center"
      >
        {/* Keyed by the number, so the new one pops in when it ticks up. */}
        <Animated.Text
          key={shownDays}
          entering={counted && progress.isNewDay ? ZoomIn.springify().damping(10) : undefined}
          className="text-center font-bold text-black dark:text-white"
          style={{ fontSize: 56, lineHeight: 56, letterSpacing: -1, fontVariant: ['tabular-nums'] }}
        >
          {shownDays}
        </Animated.Text>
        <Text className="text-center text-[15px] text-[#5C5C66] dark:text-[#B4B6C8]" style={{ marginTop: 2 }}>
          {t(`celebration.daysLoggedLabel.${category}`)}
        </Text>
      </View>

      {!progress.isNewDay && (
        <View accessible className="flex-row items-center" style={{ gap: 5, marginTop: 10 }}>
          <Svg width={14} height={14} viewBox="0 0 14 14">
            <Path
              d="M2.5 7.5 L5.75 10.5 L11.5 3.75"
              stroke={green}
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </Svg>
          <Text className="text-[14px] font-medium" style={{ color: green }}>
            {t('celebration.dayAlreadyCounts')}
          </Text>
        </View>
      )}
    </Animated.View>
  );
}

type ReminderStatus = 'idle' | 'saving' | 'on' | 'denied' | 'error';

// After the very first check-in's Continue: what comes next, and (when
// reminders aren't on yet) an offer to turn them on. Nothing else asks, so a
// new user who closed the app here had nothing bringing them back. Its own
// page rather than another card, which wouldn't fit under the oak on smaller
// phones. No tap-anywhere-to-close here, so a stray tap can't skip the offer.
// Outcomes show inline, not as a toast: the toast overlay renders under this one.
function NextUpPage({ type, onDone }: { type: CheckinCelebration['type']; onDone: () => void }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { settings, isLoading } = useReminderSettings();
  const updateReminderSettings = useUpdateReminderSettings();
  const [status, setStatus] = useState<ReminderStatus>('idle');

  const nextLine =
    type === 'evening'
      ? t('celebration.nextMorning')
      : new Date().getHours() >= EVENING_UNLOCK_HOUR
        ? t('celebration.nextEveningNow')
        : t('celebration.nextEvening', { time: hourToTime(EVENING_UNLOCK_HOUR) });
  const times = { morning: DEFAULT_MORNING_REMINDER, evening: DEFAULT_EVENING_REMINDER };
  // Already on (and not just turned on here): nothing to offer.
  const alreadyOn = settings?.push_enabled === true && status !== 'on';
  // The reminder question is still waiting for an answer.
  const offerOpen = !isLoading && !alreadyOn && (status === 'idle' || status === 'saving');

  const handleRemindMe = async () => {
    haptics.tick();
    setStatus('saving');
    const granted = await requestNotificationPermission();
    if (!granted) {
      setStatus('denied');
      return;
    }
    const { error } = await updateReminderSettings.mutateAsync({
      push_enabled: true,
      morning_time: DEFAULT_MORNING_REMINDER,
      evening_time: DEFAULT_EVENING_REMINDER,
    });
    if (error) {
      setStatus('error');
      return;
    }
    haptics.success();
    setStatus('on');
  };

  return (
    <Animated.View
      entering={FadeIn.duration(250)}
      className="flex-1 justify-between px-6"
      style={{ paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }}
    >
      <View className="flex-1 justify-center gap-6">
        <Animated.View entering={FadeInDown.duration(350)} className="items-center gap-4">
          <View className="h-16 w-16 items-center justify-center rounded-full bg-accentMuted dark:bg-primaryMutedDark">
            <Ionicons name={type === 'evening' ? 'sunny' : 'moon'} size={30} color={colors.primary} />
          </View>
          <View className="items-center gap-2">
            <Text className="text-center text-title text-black dark:text-white">{t('celebration.nextUpTitle')}</Text>
            <Text className="text-center text-body text-gray">{nextLine}</Text>
          </View>
        </Animated.View>

        {!isLoading && !alreadyOn && (
          <Animated.View
            entering={FadeInDown.delay(150).duration(350)}
            className="w-full gap-4 rounded-3xl bg-white p-5 dark:bg-surfaceDark"
          >
            <View className="flex-row items-start gap-3">
              <Ionicons name="notifications-outline" size={22} color={colors.primary} />
              <View className="flex-1 gap-1">
                <Text className="text-heading text-black dark:text-white">{t('celebration.reminderQuestion')}</Text>
                <Text className="text-label text-gray">{t('celebration.reminderBody', times)}</Text>
              </View>
            </View>

            {(status === 'idle' || status === 'saving') && (
              <Pressable
                onPress={handleRemindMe}
                disabled={status === 'saving'}
                accessibilityRole="button"
                className="items-center rounded-xl bg-primary py-3 active:opacity-90 dark:bg-primaryDark"
              >
                {status === 'saving' ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text className="text-label font-semibold text-white">{t('celebration.remindMe')}</Text>
                )}
              </Pressable>
            )}
            {status === 'on' && (
              <Text className="text-label font-semibold text-accent dark:text-white">
                ✓ {t('celebration.reminderOn', times)}
              </Text>
            )}
            {status === 'denied' && <Text className="text-label text-gray">{t('celebration.reminderDenied')}</Text>}
            {status === 'error' && <Text className="text-label text-gray">{t('celebration.reminderError')}</Text>}
          </Animated.View>
        )}
      </View>

      {/* Two separate elements, not one with swapped classes (the NativeWind
          remount gotcha). While the offer is open, "Not now" is a white card
          button so it stays secondary to "Remind me" but clearly visible on
          the grey page; otherwise Continue is the solid primary button. */}
      {offerOpen ? (
        <Pressable
          key="not-now"
          onPress={onDone}
          disabled={status === 'saving'}
          accessibilityRole="button"
          className="items-center rounded-2xl bg-white py-4 active:opacity-90 dark:bg-surfaceDark"
        >
          <Text className="text-nav text-black dark:text-white">{t('celebration.notNow')}</Text>
        </Pressable>
      ) : (
        <Pressable
          key="continue"
          onPress={onDone}
          accessibilityRole="button"
          className="items-center rounded-2xl bg-primary py-4 active:opacity-90 dark:bg-primaryDark"
        >
          <Text className="text-nav text-white">{t('celebration.continue')}</Text>
        </Pressable>
      )}
    </Animated.View>
  );
}

// The milestone lines: what unlocked, the oak's new stage, a round number.
function MilestoneLines({ progress }: { progress: CelebrationProgress }) {
  const { t } = useTranslation();
  const lines: string[] = progress.newlyUnlocked.map((key) => t(UNLOCK_KEYS[key]));
  if (lines.length === 0 && progress.stageAfter > progress.stageBefore) {
    lines.push(t('celebration.oakGrew', { stage: t(OAK_STAGE_NAME_KEYS[progress.stageAfter]) }));
  }
  if (progress.anniversary) lines.push(t('celebration.anniversary', { days: progress.anniversary }));

  return (
    <View className="items-center gap-2">
      {lines.map((line, index) => (
        <Animated.View
          key={line}
          entering={ZoomIn.delay(index * 150)
            .springify()
            .damping(12)}
          className="flex-row items-center gap-1.5 rounded-full bg-accentMuted px-4 py-2 dark:bg-primaryMutedDark"
        >
          <Text className="text-label font-semibold text-accent dark:text-white">✨ {line}</Text>
        </Animated.View>
      ))}
    </View>
  );
}

function CelebrationContent({ celebration }: { celebration: CheckinCelebration }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const hide = useCelebrationStore((state) => state.hide);
  const [phase, setPhase] = useState<PhaseValue>(Phase.Rising);
  const [skipped, setSkipped] = useState(false);
  const [showNextUp, setShowNextUp] = useState(false);
  const { progress } = celebration;
  const isMilestone = progress?.tier === 'milestone';

  // Mounted fresh for each celebration (the host renders nothing while
  // hidden), so the sequence always starts from the drop's first frame.
  useEffect(() => {
    // Phases only move forward, so a tap that skipped to the end isn't undone
    // by a timer still pending.
    const advance = (next: PhaseValue) => setPhase((current) => (next > current ? next : current));
    haptics.success();
    const timers = [
      setTimeout(() => {
        advance(Phase.Landed);
        haptics.checkin();
        if (isMilestone) sounds.milestone();
        else sounds.celebrate();
      }, PHASE_AT_MS.landed),
      setTimeout(() => {
        advance(Phase.Grown);
        if (isMilestone) haptics.success();
      }, PHASE_AT_MS.grown),
      setTimeout(() => {
        advance(Phase.Counted);
        if (progress?.isNewDay) haptics.tick();
      }, PHASE_AT_MS.counted),
      setTimeout(() => advance(Phase.Done), PHASE_AT_MS.done),
    ];
    return () => timers.forEach(clearTimeout);
  }, [isMilestone, progress?.isNewDay]);

  const title = celebration.dayComplete
    ? t('celebration.dayCompleteTitle')
    : t(celebration.type === 'morning' ? 'celebration.morningTitle' : 'celebration.eveningTitle');
  const subLine = celebration.dayComplete
    ? t('celebration.dayCompleteBody')
    : progress?.isFirstEver
      ? t('celebration.firstSub')
      : t(SUB_LINE_KEYS[(progress?.daysAfter ?? 0) % SUB_LINE_KEYS.length]);

  const skyVariant = skyVariantFor(celebration);
  const stageBefore = progress?.stageBefore ?? FALLBACK_OAK_STAGE;

  // The very first check-in continues to "what's next" instead of closing.
  const finish = () => (progress?.isFirstEver ? setShowNextUp(true) : hide());
  // A tap anywhere before the end skips to it; after that it continues.
  const handlePress = () => {
    if (phase >= Phase.Done) {
      finish();
      return;
    }
    setSkipped(true);
    setPhase(Phase.Done);
  };

  if (showNextUp) return <NextUpPage type={celebration.type} onDone={hide} />;

  return (
    <Pressable
      onPress={handlePress}
      accessibilityLabel={title}
      className="flex-1 items-center justify-between px-6"
      style={{ paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }}
    >
      <View className="w-full flex-1 items-center justify-center gap-5">
        <CheckinSkyScene
          variant={skyVariant}
          stageBefore={stageBefore}
          stageAfter={progress?.stageAfter ?? stageBefore}
          skipped={skipped}
          reduceMotion={reduceMotion}
        />

        <View className="min-h-20 items-center">
          {phase >= Phase.Landed && (
            <Animated.View entering={FadeInDown.duration(350)} className="items-center gap-2">
              <View className="flex-row items-center gap-2">
                <View className="h-7 w-7 items-center justify-center rounded-full bg-primary dark:bg-primaryDark">
                  <Ionicons name="checkmark" size={18} color={colors.white} />
                </View>
                <Text className="text-title text-black dark:text-white">{title}</Text>
              </View>
              <Text className="text-center text-body text-gray">{subLine}</Text>
            </Animated.View>
          )}
          {progress && phase >= Phase.Grown && <DayStats progress={progress} phase={phase} />}
        </View>

        <View className="min-h-12 w-full">
          {progress && isMilestone && phase >= Phase.Grown && <MilestoneLines progress={progress} />}
        </View>

        <View className="w-full">
          {progress && phase >= Phase.Grown && <NextUnlockRow progress={progress} phase={phase} />}
        </View>
      </View>

      <View className="h-14 w-full">
        {phase >= Phase.Done && (
          <Animated.View entering={FadeIn.duration(250)} className="w-full">
            <Pressable
              onPress={finish}
              accessibilityRole="button"
              className="items-center rounded-2xl bg-primary py-4 active:opacity-90 dark:bg-primaryDark"
            >
              <Text className="text-nav text-white">{t('celebration.continue')}</Text>
            </Pressable>
          </Animated.View>
        )}
      </View>
    </Pressable>
  );
}

function skyVariantFor(celebration: CheckinCelebration | null): SkyVariant {
  if (!celebration) return 'evening';
  return celebration.dayComplete ? 'dayComplete' : celebration.type;
}

// The "check-in complete" screen, after a check-in is newly logged
// (useCheckinCelebration). It replaced both the success toast and the old
// auto-dismissing watering overlay, so finishing is one moment: the sun
// rises (morning) or the moon and fireflies come out (evening) over the oak
// (CheckinSkyScene), then what the user earned (the day count, the next
// unlock, and on milestones the oak growing and a leaf burst), then Continue.
//
// Plain in-tree overlay, not RN's <Modal>: it goes up right as the check-in
// screen pops (router.back()), and a native Modal presenting at that moment
// races the navigator and can freeze touch input (see ToastModalHost).
// Rendered once at root after the Stack, so it also covers the tab bar.
export function WateringCelebrationHost() {
  const visible = useCelebrationStore((state) => state.visible);
  const celebration = useCelebrationStore((state) => state.celebration);
  // The whole screen takes the sky colour of the moment (warm morning, cool
  // evening), so the sun/moon scene has no box around it. Via `style`: it's
  // a theme.ts colour that NativeWind has no class for.
  const skyColor = useSkyColor(skyVariantFor(celebration));

  if (!visible || !celebration) return null;

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(250)}
      className="absolute inset-0"
      style={{ backgroundColor: skyColor }}
    >
      <CelebrationContent celebration={celebration} />
    </Animated.View>
  );
}
