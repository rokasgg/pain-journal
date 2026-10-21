import { Pressable, Text, View } from 'react-native';

import { OakTree } from '@/components/OakTree';
import { useOakStage } from '@/hooks/useOakStage';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { OAK_STAGE_NAME_KEYS } from '@/lib/oak';
import { useCelebrationStore } from '@/store/useCelebrationStore';

const OAK_SIZE = 72;

export function OakCard() {
  const { t } = useTranslation();
  const { stage } = useOakStage();

  return (
    // Long-press is a hidden dev affordance to preview the watering
    // celebration without completing a real check-in — no visible hint.
    <Pressable
      onLongPress={() => useCelebrationStore.getState().show()}
      className="flex-row items-center gap-3 rounded-2xl bg-surface p-4 dark:bg-surfaceDark border-primary dark:border-primaryDark"
    >
      {/* Fixed box even while loading, so the card never jumps. */}
      <View style={{ width: OAK_SIZE, height: (OAK_SIZE * 160) / 120 }}>
        {stage !== null && <OakTree stage={stage} size={OAK_SIZE} />}
      </View>
      <View className="flex-1 gap-1">
        <Text className="text-base font-semibold text-black dark:text-white">{t('home.oakTitle')}</Text>
        {stage !== null && <Text className="text-sm text-gray">{t(OAK_STAGE_NAME_KEYS[stage])}</Text>}
      </View>
    </Pressable>
  );
}
