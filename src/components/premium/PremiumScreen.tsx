import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LockedCard } from '@/components/premium/LockedCard';
import { usePremium } from '@/hooks/usePremium';
import { useTranslation } from '@/lib/i18n/useTranslation';
import type { PremiumFeature } from '@/lib/premium';
import { colors } from '@/lib/theme';

export interface PremiumScreenProps {
  feature: PremiumFeature;
  children: ReactNode;
  /** For headerless routes (full-screen wizards, the Wrap): draws its own ✕. */
  showClose?: boolean;
}

// Whole-screen gate for Premium-only routes (reached by direct navigation,
// a deep link, or an old link). Wrap the screen's content component in the
// route's default export, so the content's hooks never run for free users:
//   export default function X() { return <PremiumScreen feature="ai"><XContent /></PremiumScreen>; }
export function PremiumScreen({ feature, children, showClose = false }: PremiumScreenProps) {
  const { isPremium } = usePremium();
  const router = useRouter();
  const { t } = useTranslation();
  if (isPremium) return <>{children}</>;

  const body = (
    <ScrollView className="flex-1" contentContainerClassName="gap-4 px-6 py-6">
      {showClose && (
        <View className="flex-row justify-end">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('premium.paywall.close')}
            onPress={() => router.back()}
            hitSlop={12}
            className="h-9 w-9 items-center justify-center rounded-full bg-segmentTrack dark:bg-segmentTrackDark"
          >
            <Ionicons name="close" size={20} color={colors.inkSecondary} />
          </Pressable>
        </View>
      )}
      <LockedCard feature={feature} />
    </ScrollView>
  );

  return showClose ? (
    <SafeAreaView className="flex-1 bg-background dark:bg-backgroundDark">{body}</SafeAreaView>
  ) : (
    <View className="flex-1 bg-background dark:bg-backgroundDark">{body}</View>
  );
}
