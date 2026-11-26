import { Redirect } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { GrowthCelebration } from '@/components/oak/GrowthCelebration';
import { LAST_OAK_STAGE_INDEX, OAK_STAGES } from '@/components/oak/oakConfig';
import { WateringCelebration } from '@/components/oak/WateringCelebration';
import { useTranslation } from '@/lib/i18n/useTranslation';

type Preview = { kind: 'watering'; stageIndex: number } | { kind: 'growth'; fromStageIndex: number };

// Dev-only: preview the training oak's watering for each stage and each
// growth transition, with a replay. Reached from Settings (__DEV__ only).
export default function OakCelebrationsPreview() {
  const { t } = useTranslation();
  const [preview, setPreview] = useState<Preview>({ kind: 'watering', stageIndex: 0 });
  const [replay, setReplay] = useState(0);

  if (!__DEV__) return <Redirect href="/" />;

  const choose = (next: Preview) => {
    setPreview(next);
    setReplay((count) => count + 1);
  };
  const again = () => setReplay((count) => count + 1);
  const isSelected = (next: Preview) => JSON.stringify(next) === JSON.stringify(preview);

  const options: { label: string; value: Preview }[] = [
    ...OAK_STAGES.map((stage, stageIndex) => ({
      label: t('dev.oakPreview.water', { stage: t(stage.nameKey) }),
      value: { kind: 'watering', stageIndex } as Preview,
    })),
    ...OAK_STAGES.slice(0, LAST_OAK_STAGE_INDEX).map((stage, fromStageIndex) => ({
      label: t('dev.oakPreview.grow', { from: t(stage.nameKey), to: t(OAK_STAGES[fromStageIndex + 1].nameKey) }),
      value: { kind: 'growth', fromStageIndex } as Preview,
    })),
  ];

  // Two waterings into the stage, so the progress row has a drop to pop.
  const wateringsFor = (stageIndex: number) => OAK_STAGES[stageIndex].minWaterings + 2;

  return (
    <View className="flex-1 bg-background dark:bg-backgroundDark">
      <View className="max-h-36">
        <ScrollView contentContainerClassName="flex-row flex-wrap gap-2 px-4 py-3">
          {options.map((option) => (
            <Pressable
              key={option.label}
              onPress={() => choose(option.value)}
              className="rounded-full bg-surface px-3 py-2 dark:bg-surfaceDark"
              style={isSelected(option.value) ? { opacity: 1 } : { opacity: 0.55 }}
            >
              <Text className="text-label text-black dark:text-white">{option.label}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <View className="flex-1 py-4">
        {preview.kind === 'watering' ? (
          <WateringCelebration
            key={replay}
            stageIndex={preview.stageIndex}
            waterings={preview.stageIndex === LAST_OAK_STAGE_INDEX ? 52 : wateringsFor(preview.stageIndex)}
            counted
            onDone={again}
          />
        ) : (
          <GrowthCelebration
            key={replay}
            fromStageIndex={preview.fromStageIndex}
            stageIndex={preview.fromStageIndex + 1}
            onDone={again}
          />
        )}
      </View>

      <View className="px-6 pb-10">
        <Pressable onPress={again} className="items-center rounded-2xl bg-surface py-3 dark:bg-surfaceDark">
          <Text className="text-nav text-black dark:text-white">{t('dev.oakPreview.replay')}</Text>
        </Pressable>
      </View>
    </View>
  );
}
