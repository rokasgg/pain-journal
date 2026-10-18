import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { WebView } from 'react-native-webview';

import { FLOWER_JUMP_SVG } from '@/constants/flowerJumpSvg';
import { ONBOARDING_TOTAL_STEPS } from '@/constants/onboarding';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { colors } from '@/lib/theme';
import { haptics } from '@/utils/haptics';

export interface OnboardingIntroProps {
  name?: string;
  onStart: () => void;
}

const FLOWER_SIZE = 150;
const FLOWER_HTML = `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" /><style>html, body { margin: 0; padding: 0; background: transparent; overflow: hidden; } svg { display: block; width: 100%; height: 100%; }</style></head><body>${FLOWER_JUMP_SVG}</body></html>`;

function MetaChip({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  return (
    <View className="flex-row items-center gap-1.5 rounded-full bg-primaryMuted px-3 py-1.5 dark:bg-primaryMutedDark">
      <Ionicons name={icon} size={14} color={colors.primary} />
      <Text className="text-sm font-medium text-strongGray dark:text-white">{label}</Text>
    </View>
  );
}

// The first screen after registering, before onboarding question 1: a warm
// greeting that says why the questions are being asked and how long they
// take. Copy is about the user's goal, not the app ("thanks for downloading"
// was deliberately avoided).
export function OnboardingIntro({ name, onStart }: OnboardingIntroProps) {
  const { t } = useTranslation();
  const trimmedName = name?.trim();

  return (
    <View className="flex-1 justify-between px-6 pb-12 pt-6">
      <View className="flex-1 items-center justify-center gap-6">
        {/* Explicit size on the WebView itself — a flex:1 WebView inside an
            aligned wrapper collapses to zero width (see CLAUDE.md). */}
        <Animated.View entering={FadeInDown.duration(500)} style={{ width: FLOWER_SIZE, height: FLOWER_SIZE }}>
          <WebView
            originWhitelist={['*']}
            source={{ html: FLOWER_HTML }}
            scrollEnabled={false}
            pointerEvents="none"
            style={{ width: '100%', height: '100%', backgroundColor: 'transparent' }}
            containerStyle={{ backgroundColor: 'transparent' }}
          />
        </Animated.View>

        <View className="gap-4">
          <Animated.Text
            entering={FadeInDown.delay(150).duration(500)}
            className="text-center text-3xl font-bold text-black dark:text-white"
          >
            {trimmedName ? t('onboarding.introTitle', { name: trimmedName }) : t('onboarding.introTitleNoName')}
          </Animated.Text>
          <Animated.Text
            entering={FadeInDown.delay(300).duration(500)}
            className="text-center text-base text-strongGray dark:text-white"
          >
            {t('onboarding.introBody')}
          </Animated.Text>
          <Animated.Text
            entering={FadeInDown.delay(450).duration(500)}
            className="text-center text-base font-medium text-black dark:text-white"
          >
            {t('onboarding.introLead')}
          </Animated.Text>
        </View>

        <Animated.View entering={FadeInDown.delay(600).duration(500)} className="flex-row gap-2">
          <MetaChip icon="help-circle-outline" label={t('onboarding.introQuestions', { count: ONBOARDING_TOTAL_STEPS })} />
          <MetaChip icon="time-outline" label={t('onboarding.introDuration')} />
        </Animated.View>
      </View>

      <Pressable
        onPress={() => {
          haptics.tap();
          onStart();
        }}
        accessibilityRole="button"
        className="items-center rounded-xl bg-primary py-4 active:opacity-90 dark:bg-primaryDark"
      >
        <Text className="text-base font-semibold text-white">{t('onboarding.introCta')}</Text>
      </Pressable>
    </View>
  );
}
