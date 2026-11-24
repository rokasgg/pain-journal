import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, {
  Easing as ReanimatedEasing,
  FadeIn,
  FadeInDown,
  FadeOut,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { OakTree } from '@/components/OakTree';
import type { CelebratedUnlock, CelebrationProgress, CheckinCelebration } from '@/lib/checkinCelebration';
import { formatDayCount } from '@/lib/i18n/plural';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { OAK_STAGE_NAME_KEYS } from '@/lib/oak';
import { colors } from '@/lib/theme';
import { DROP_LAND_MS, useCelebrationStore } from '@/store/useCelebrationStore';
import { haptics } from '@/utils/haptics';
import { sounds } from '@/utils/sounds';

const BOX_WIDTH = 140;
const BOX_HEIGHT = 300;
const OAK_HEIGHT = (BOX_WIDTH * 160) / 120;
const DROP_COLOR = '#3B9AE1';
// DROP_LAND_MS = DROP_DURATION_MS · sqrt(0.8): the drop reaches the oak at
// 80% of its eased (quad-in) travel. The "droplets" haptic, the chime and
// the oak's watered state all fire right then, so they land with the water.
const DROP_DURATION_MS = DROP_LAND_MS / Math.sqrt(0.8);
const DROP_START_Y = -24;
const DROP_END_Y = BOX_HEIGHT - OAK_HEIGHT - 10;

// The sequence after the drop lands. Each phase reveals one more thing, so
// the moment builds up instead of arriving all at once.
const Phase = {
  Falling: 0,
  Landed: 1, // oak watered, chime, headline
  Grown: 2, // milestone growth + leaf burst, the day counter appears
  Counted: 3, // the day number ticks up, the new bar segment fills
  Done: 4, // Continue appears
} as const;
type PhaseValue = (typeof Phase)[keyof typeof Phase];
const PHASE_AT_MS = {
  landed: DROP_LAND_MS,
  grown: DROP_LAND_MS + 400,
  counted: DROP_LAND_MS + 900,
  done: DROP_LAND_MS + 1400,
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

const LEAF_COUNT = 9;
const LEAF_COLORS = [colors.primary, '#6FA27C', '#A9C98A'];

function WaterDrop() {
  const fall = useSharedValue(0);

  useEffect(() => {
    fall.set(withTiming(1, { duration: DROP_DURATION_MS, easing: ReanimatedEasing.in(ReanimatedEasing.quad) }));
  }, [fall]);

  const style = useAnimatedStyle(() => {
    const p = fall.get();
    return {
      opacity: interpolate(p, [0, 0.8, 1], [1, 1, 0]),
      transform: [
        { translateY: interpolate(p, [0, 0.8, 1], [DROP_START_Y, DROP_END_Y, DROP_END_Y]) },
        { scale: interpolate(p, [0, 0.8, 1], [1, 2, 5]) },
      ],
    };
  });

  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', top: 0, left: BOX_WIDTH / 2 - 8 }, style]}>
      <Ionicons name="water" size={16} color={DROP_COLOR} />
    </Animated.View>
  );
}

// One leaf of the milestone burst: flies out from the crown and fades.
function Leaf({ index }: { index: number }) {
  const progress = useSharedValue(0);
  const angle = (index / LEAF_COUNT) * Math.PI * 2 + 0.3;
  const distance = 70 + (index % 3) * 18;

  useEffect(() => {
    progress.set(withTiming(1, { duration: 900, easing: ReanimatedEasing.out(ReanimatedEasing.cubic) }));
  }, [progress]);

  const style = useAnimatedStyle(() => {
    const p = progress.get();
    return {
      opacity: p < 0.6 ? 1 : 1 - (p - 0.6) / 0.4,
      transform: [
        { translateX: Math.cos(angle) * distance * p },
        // A little gravity: up first, then drifting down.
        { translateY: Math.sin(angle) * distance * p + 30 * p * p },
        { rotate: `${(index % 2 === 0 ? 1 : -1) * 160 * p}deg` },
        { scale: 0.6 + 0.6 * p },
      ],
    };
  });

  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: BOX_WIDTH / 2 - 9, top: '45%' }, style]}>
      <Ionicons name="leaf" size={18} color={LEAF_COLORS[index % LEAF_COLORS.length]} />
    </Animated.View>
  );
}

function CelebrationOak({
  progress,
  phase,
  reduceMotion,
}: {
  progress: CelebrationProgress | null;
  phase: PhaseValue;
  reduceMotion: boolean;
}) {
  const stageBefore = progress?.stageBefore ?? 3;
  const stageAfter = progress?.stageAfter ?? stageBefore;
  const grew = stageAfter > stageBefore;
  const stage = grew && phase >= Phase.Grown ? stageAfter : stageBefore;
  const isMilestone = progress?.tier === 'milestone';

  return (
    <View style={{ width: BOX_WIDTH, height: BOX_HEIGHT }}>
      <View style={{ position: 'absolute', bottom: 0, left: 0, width: BOX_WIDTH, height: OAK_HEIGHT }}>
        <OakTree stage={stage} watered={phase >= Phase.Landed} size={BOX_WIDTH} />
      </View>
      {!reduceMotion && phase === Phase.Falling && <WaterDrop />}
      {!reduceMotion &&
        isMilestone &&
        phase >= Phase.Grown &&
        Array.from({ length: LEAF_COUNT }, (_, index) => <Leaf key={index} index={index} />)}
    </View>
  );
}

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

function ProgressCard({ progress, phase }: { progress: CelebrationProgress; phase: PhaseValue }) {
  const { t, locale } = useTranslation();
  const counted = phase >= Phase.Counted;
  const shownDays = progress.isNewDay && !counted ? progress.daysBefore : progress.daysAfter;
  const next = progress.next;

  return (
    <Animated.View
      entering={FadeInDown.duration(350)}
      className="w-full gap-4 rounded-3xl bg-white p-5 dark:bg-surfaceDark"
    >
      <View className="flex-row items-center justify-between">
        <View>
          <Text className="text-label text-gray">{t('celebration.dayLabel')}</Text>
          {/* Keyed by the number, so the new one pops in when it ticks up. */}
          <Animated.Text
            key={shownDays}
            entering={counted && progress.isNewDay ? ZoomIn.springify().damping(10) : undefined}
            className="text-display text-black dark:text-white"
          >
            {shownDays}
          </Animated.Text>
        </View>
        {!progress.isNewDay && <Text className="text-label text-gray">{t('celebration.alreadyCounted')}</Text>}
      </View>

      {next && (
        <View className="gap-2">
          <SegmentBar
            total={next.days}
            filled={progress.daysAfter}
            newIndex={progress.isNewDay ? progress.daysBefore : null}
            showNew={counted}
          />
          <View className="flex-row items-center justify-between">
            <Text className="text-label font-semibold text-black dark:text-white">
              {t(NEXT_KEYS[next.key], { days: formatDayCount(next.daysRemaining, locale) })}
            </Text>
            <Text className="text-label text-gray">
              {t('journey.sheet.progressLabel', { done: progress.daysAfter, total: next.days })}
            </Text>
          </View>
        </View>
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
  const [phase, setPhase] = useState<PhaseValue>(Phase.Falling);
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
        haptics.droplets();
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
    : t(SUB_LINE_KEYS[(progress?.daysAfter ?? 0) % SUB_LINE_KEYS.length]);

  // A tap anywhere before the end skips to it; after that it closes.
  const handlePress = () => (phase >= Phase.Done ? hide() : setPhase(Phase.Done));

  return (
    <Pressable
      onPress={handlePress}
      accessibilityLabel={title}
      className="flex-1 items-center justify-between px-6"
      style={{ paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }}
    >
      <View className="w-full flex-1 items-center justify-center gap-5">
        <CelebrationOak progress={progress} phase={phase} reduceMotion={reduceMotion} />

        <View className="min-h-20 items-center gap-2">
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
        </View>

        <View className="min-h-12 w-full">
          {progress && isMilestone && phase >= Phase.Grown && <MilestoneLines progress={progress} />}
        </View>

        <View className="w-full">
          {progress && phase >= Phase.Grown && <ProgressCard progress={progress} phase={phase} />}
        </View>
      </View>

      <View className="h-14 w-full">
        {phase >= Phase.Done && (
          <Animated.View entering={FadeIn.duration(250)} className="w-full">
            <Pressable
              onPress={hide}
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

// The "check-in complete" screen, after a check-in is newly logged
// (useCheckinCelebration). It replaced both the success toast and the old
// auto-dismissing watering overlay, so finishing is one moment: the drop
// waters the oak, then what the user earned (the day count, the next unlock,
// and on milestones the oak growing and a leaf burst), then Continue.
//
// Plain in-tree overlay, not RN's <Modal>: it goes up right as the check-in
// screen pops (router.back()), and a native Modal presenting at that moment
// races the navigator and can freeze touch input (see ToastModalHost).
// Rendered once at root after the Stack, so it also covers the tab bar.
export function WateringCelebrationHost() {
  const visible = useCelebrationStore((state) => state.visible);
  const celebration = useCelebrationStore((state) => state.celebration);

  if (!visible || !celebration) return null;

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(250)}
      className="absolute inset-0 bg-background dark:bg-backgroundDark"
    >
      <CelebrationContent celebration={celebration} />
    </Animated.View>
  );
}
