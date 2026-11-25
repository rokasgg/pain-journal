import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { Pressable, Text, View, type ViewProps } from 'react-native';

import { paywallHref } from '@/hooks/usePremiumAction';
import { useTranslation } from '@/lib/i18n/useTranslation';
import type { PremiumFeature } from '@/lib/premium';
import { colors } from '@/lib/theme';

export interface LockedCardProps extends ViewProps {
  feature: PremiumFeature;
  /** Overrides the feature's default title (e.g. "3 findings are ready"). */
  title?: string;
  /** Hides the "your entries are kept" line (e.g. for features with no data yet). */
  hideFooter?: boolean;
  className?: string;
}

// What a free user sees in place of a Premium surface: what it is, that
// their data is safe, and one CTA into the paywall. Never guilt.
export function LockedCard({ feature, title, hideFooter = false, className, ...props }: LockedCardProps) {
  const { t } = useTranslation();
  const heading = title ?? t(`premium.features.${feature}.title`);

  return (
    <View className={`gap-3 rounded-[18px] bg-surface p-4 dark:bg-surfaceDark ${className ?? ''}`} {...props}>
      <View className="flex-row items-center gap-3">
        <View className="h-10 w-10 items-center justify-center rounded-xl bg-accentMuted dark:bg-primaryMutedDark">
          <Ionicons name="lock-closed" size={18} color={colors.accent} />
        </View>
        <View className="flex-1">
          <Text className="text-[12px] font-semibold uppercase tracking-wide text-accent dark:text-primaryDark">
            {t('premium.badge')}
          </Text>
          <Text className="text-[16px] font-semibold leading-[22px] text-ink dark:text-white">{heading}</Text>
        </View>
      </View>
      <Text className="text-[15px] leading-5 text-inkSecondary dark:text-gray">
        {t(`premium.features.${feature}.body`)}
      </Text>
      <Link href={paywallHref(feature)} asChild>
        <Pressable
          accessibilityRole="button"
          className="items-center rounded-full bg-primary py-3 active:opacity-90 dark:bg-primaryDark"
        >
          <Text className="text-[15px] font-semibold text-white">{t('premium.tryFree')}</Text>
        </Pressable>
      </Link>
      {!hideFooter && (
        <Text className="text-center text-[12px] leading-4 text-inkSecondary dark:text-gray">
          {t('premium.lockedFooter')}
        </Text>
      )}
    </View>
  );
}
