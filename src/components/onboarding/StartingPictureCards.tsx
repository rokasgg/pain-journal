import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';

import { useTranslation } from '@/lib/i18n/useTranslation';
import type { PictureCard, PictureCardId } from '@/lib/startingPicture';
import { colors } from '@/lib/theme';

const ICONS: Record<PictureCardId, keyof typeof Ionicons.glyphMap> = {
  startingPoint: 'flag-outline',
  learnAsYouLog: 'leaf-outline',
  sitting: 'desktop-outline',
  stress: 'pulse-outline',
  screens: 'phone-portrait-outline',
  sleep: 'bed-outline',
  onFeet: 'walk-outline',
  worstTime: 'time-outline',
};

// The "We'll keep an eye on…" cards (src/lib/startingPicture.ts), shown after
// onboarding and at the bottom of Settings → About me.
export function StartingPictureCards({ cards }: { cards: PictureCard[] }) {
  const { t } = useTranslation();

  return (
    <View className="gap-3">
      {cards.map((card) => (
        <View key={card.id} className="flex-row gap-3 rounded-[18px] bg-surface p-4 dark:bg-surfaceDark">
          <View className="h-10 w-10 items-center justify-center rounded-xl bg-accentMuted dark:bg-primaryMutedDark">
            <Ionicons name={ICONS[card.id]} size={20} color={colors.accent} />
          </View>
          <View className="flex-1 gap-1">
            <Text className="text-[16px] font-semibold text-ink dark:text-white">
              {t(`startingPicture.cards.${card.id}.title`)}
            </Text>
            <Text className="text-[14px] leading-5 text-inkSecondary dark:text-gray">
              {t(`startingPicture.cards.${card.id}.body`, {
                experiment: card.experiment ? t(`experiments.templates.${card.experiment}.title`) : '',
                time: card.worstTime ? t(`startingPicture.worstTime.${card.worstTime}`) : '',
              })}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}
