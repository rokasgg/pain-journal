import { Redirect } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { CheckinSkyScene, useSkyColor } from '@/components/oak/CheckinSkyScene';
import { OAK_STAGE_LIST, OAK_STAGES } from '@/components/oak/oakConfig';
import { WateringCelebration } from '@/components/oak/WateringCelebration';
import { useTranslation } from '@/lib/i18n/useTranslation';
import type { OakStage } from '@/lib/oak';

type Moment = 'morning' | 'evening' | 'dayComplete' | 'growth' | 'training';
const MOMENTS: readonly Moment[] = ['morning', 'evening', 'dayComplete', 'growth', 'training'];
const MOMENT_KEYS: Record<Moment, string> = {
  morning: 'dev.oakPreview.morning',
  evening: 'dev.oakPreview.evening',
  dayComplete: 'dev.oakPreview.dayComplete',
  growth: 'dev.oakPreview.growth',
  training: 'dev.oakPreview.training',
};

function Chip({
  label,
  selected,
  disabled,
  onPress,
}: {
  label: string;
  selected: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  // Selection via style, not a className swap (NativeWind remount gotcha).
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className="rounded-full bg-surface px-3 py-2 dark:bg-surfaceDark"
      style={{ opacity: disabled ? 0.25 : selected ? 1 : 0.5 }}
    >
      <Text className="text-label text-black dark:text-white">{label}</Text>
    </Pressable>
  );
}

// Dev-only: preview the check-in sky moments, a check-in milestone growth
// (stage N → N+1) and the training watering, for every oak stage, with a
// replay. Reached from Settings (__DEV__ only).
export default function OakCelebrationsPreview() {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const [moment, setMoment] = useState<Moment>('morning');
  const [stage, setStage] = useState<OakStage>(1);
  const [replay, setReplay] = useState(0);
  const [skipped, setSkipped] = useState(false);
  const skyColor = useSkyColor(moment === 'morning' ? 'morning' : 'evening');

  if (!__DEV__) return <Redirect href="/" />;

  const again = () => {
    setSkipped(false);
    setReplay((count) => count + 1);
  };
  const chooseMoment = (next: Moment) => {
    setMoment(next);
    if (next === 'growth' && stage === 5) setStage(4);
    again();
  };
  const chooseStage = (next: OakStage) => {
    setStage(next);
    again();
  };

  const isSky = moment !== 'training';
  const stageAfter: OakStage = moment === 'growth' ? ((stage + 1) as OakStage) : stage;

  return (
    // Sky moments paint the page in their sky colour, like the real screen.
    <View
      className="flex-1 bg-background dark:bg-backgroundDark"
      style={moment === 'training' ? undefined : { backgroundColor: skyColor }}
    >
      <View className="gap-2 px-4 py-3">
        <View className="flex-row flex-wrap gap-2">
          {MOMENTS.map((value) => (
            <Chip
              key={value}
              label={t(MOMENT_KEYS[value])}
              selected={value === moment}
              onPress={() => chooseMoment(value)}
            />
          ))}
        </View>
        <View className="flex-row flex-wrap gap-2">
          {OAK_STAGE_LIST.map((value) => (
            <Chip
              key={value}
              label={t(OAK_STAGES[value].nameKey)}
              selected={value === stage}
              disabled={moment === 'growth' && value === 5}
              onPress={() => chooseStage(value)}
            />
          ))}
        </View>
      </View>

      {isSky ? (
        <Pressable onPress={() => setSkipped(true)} className="flex-1 items-center justify-center">
          <CheckinSkyScene
            key={replay}
            variant={moment === 'growth' ? 'evening' : moment}
            stageBefore={stage}
            stageAfter={stageAfter}
            skipped={skipped}
            reduceMotion={reduceMotion}
          />
        </Pressable>
      ) : (
        <View className="flex-1 py-4">
          <WateringCelebration key={replay} stage={stage} sessions={2} goal={3} counted onDone={again} />
        </View>
      )}

      <View className="px-6 pb-10">
        <Pressable onPress={again} className="items-center rounded-2xl bg-surface py-3 dark:bg-surfaceDark">
          <Text className="text-nav text-black dark:text-white">{t('dev.oakPreview.replay')}</Text>
        </Pressable>
      </View>
    </View>
  );
}
