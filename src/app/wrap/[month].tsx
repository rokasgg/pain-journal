import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Text, useWindowDimensions, View } from 'react-native';
import { cancelAnimation, Easing, useSharedValue, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { StoryProgress } from '@/components/wrap/StoryProgress';
import { SLIDE_STYLES, WrapSlideView } from '@/components/wrap/WrapSlideView';
import { useMonthlyWrap } from '@/hooks/useMonthlyWrap';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { colors } from '@/lib/theme';
import { useWrapStore } from '@/store/useWrapStore';
import { haptics } from '@/utils/haptics';

const SLIDE_DURATION_MS = 6000;
// Taps on the left third go back, anywhere else goes forward (story convention).
const BACK_ZONE = 1 / 3;

export default function WrapScreen() {
  const { month } = useLocalSearchParams<{ month: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const { slides, isLoading } = useMonthlyWrap(month);
  const [index, setIndex] = useState(0);
  const progress = useSharedValue(0);
  const isPausedRef = useRef(false);

  const slideCount = slides?.length ?? 0;
  const isLast = index === slideCount - 1;

  useEffect(() => {
    if (month) useWrapStore.getState().markSeen(month);
  }, [month]);

  const goNext = useCallback(() => setIndex((i) => Math.min(i + 1, slideCount - 1)), [slideCount]);
  const goBack = useCallback(() => setIndex((i) => Math.max(i - 1, 0)), []);

  const runTimer = useCallback(
    (fromProgress: number) => {
      // .set()/.get() rather than `.value =` — the React Compiler lint rule
      // rejects mutating a value that was passed into a hook.
      progress.set(fromProgress);
      progress.set(
        withTiming(
          1,
          { duration: (1 - fromProgress) * SLIDE_DURATION_MS, easing: Easing.linear },
          (finished) => {
            if (finished) scheduleOnRN(goNext);
          },
        ),
      );
    },
    [progress, goNext],
  );

  // Restart the fill on every slide change; the last slide just sits full
  // (no auto-advance) until the user taps Done or ✕.
  useEffect(() => {
    if (slideCount === 0) return;
    haptics.tick();
    if (isLast) {
      cancelAnimation(progress);
      progress.set(1);
    } else {
      runTimer(0);
    }
    return () => cancelAnimation(progress);
  }, [index, slideCount, isLast, progress, runTimer]);

  const handleTap = (x: number) => {
    if (x < width * BACK_ZONE) goBack();
    else if (!isLast) goNext();
  };

  const handlePause = () => {
    if (isLast) return;
    isPausedRef.current = true;
    cancelAnimation(progress);
  };

  const handleResume = () => {
    if (!isPausedRef.current) return;
    isPausedRef.current = false;
    runTimer(progress.get());
  };

  if (isLoading || !slides) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center gap-4 bg-background px-8 dark:bg-backgroundDark">
        {isLoading ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <>
            <Text className="text-center text-base text-black dark:text-white">{t('wrap.unavailable')}</Text>
            <Pressable onPress={() => router.back()} className="rounded-lg bg-primary px-6 py-3 dark:bg-primaryDark">
              <Text className="font-medium text-white">{t('wrap.close')}</Text>
            </Pressable>
          </>
        )}
      </SafeAreaView>
    );
  }

  const slide = slides[index];
  const styles = SLIDE_STYLES[slide.kind];

  return (
    <SafeAreaView className={`flex-1 ${styles.container}`}>
      <View className="flex-row items-center gap-3 px-4 pt-2">
        <StoryProgress count={slideCount} index={index} progress={progress} className="flex-1" />
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel={t('wrap.close')}>
          <Ionicons name="close" size={26} color={styles.lightText ? colors.white : colors.gray} />
        </Pressable>
      </View>

      <Pressable
        className="flex-1"
        onPress={(event) => handleTap(event.nativeEvent.locationX)}
        onLongPress={handlePause}
        onPressOut={handleResume}
        delayLongPress={200}
      >
        {/* Keyed so each slide remounts and replays its entering animations. */}
        <WrapSlideView key={index} slide={slide} month={month} />
      </Pressable>

      {isLast && (
        <View className="px-8 pb-6">
          <Pressable
            onPress={() => router.back()}
            className="items-center rounded-lg bg-white py-3 active:opacity-90 dark:bg-black"
          >
            <Text className="font-semibold text-primary dark:text-white">{t('wrap.done')}</Text>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}
