import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, Text, View } from 'react-native';

import { PRIVACY_POLICY_URL, TERMS_URL } from '@/constants/app';
import { premiumQueryKey } from '@/hooks/usePremium';
import { useSession } from '@/hooks/useSession';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { isPremiumFeature, type PremiumFeature } from '@/lib/premium';
import { getPackages, premiumInfoFrom, purchase, restore, type PurchasesPackage } from '@/lib/purchases';
import { colors } from '@/lib/theme';
import { haptics } from '@/utils/haptics';
import { toast } from '@/utils/toast';

type BenefitKey = 'ai' | 'findings' | 'history' | 'report' | 'physio' | 'wrap';

const BENEFITS: { key: BenefitKey; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'findings', icon: 'bulb-outline' },
  { key: 'ai', icon: 'chatbubbles-outline' },
  { key: 'history', icon: 'calendar-outline' },
  { key: 'report', icon: 'document-text-outline' },
  { key: 'physio', icon: 'barbell-outline' },
  { key: 'wrap', icon: 'sparkles-outline' },
];

// Only the two subscriptions are sold (no lifetime); anything else in the
// offering is ignored. Annual first.
function sortPackages(packages: PurchasesPackage[]): PurchasesPackage[] {
  const rank = (pkg: PurchasesPackage) => (pkg.packageType === 'ANNUAL' ? 0 : 1);
  return packages
    .filter((pkg) => pkg.packageType === 'ANNUAL' || pkg.packageType === 'MONTHLY')
    .sort((a, b) => rank(a) - rank(b));
}

export default function PaywallScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useSession();
  const params = useLocalSearchParams<{ feature?: string }>();
  const feature: PremiumFeature = isPremiumFeature(params.feature) ? params.feature : 'findings';

  const [packages, setPackages] = useState<PurchasesPackage[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState<'purchase' | 'restore' | null>(null);

  useEffect(() => {
    let cancelled = false;
    getPackages().then(({ packages: loaded }) => {
      if (cancelled) return;
      const sorted = sortPackages(loaded);
      setPackages(sorted);
      setSelectedId(sorted[0]?.identifier ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const selected = packages?.find((pkg) => pkg.identifier === selectedId) ?? null;
  const hasTrial = !!selected?.product.introPrice && selected.product.introPrice.price === 0;

  const refreshEntitlement = () => queryClient.invalidateQueries({ queryKey: premiumQueryKey(user?.id) });

  const onPurchase = async () => {
    if (!selected || busy) return;
    setBusy('purchase');
    const result = await purchase(selected);
    setBusy(null);
    if (result.cancelled) return;
    if (result.error || !result.info) {
      toast.error(t('premium.paywall.error'));
      return;
    }
    refreshEntitlement();
    if (premiumInfoFrom(result.info).active) {
      // Toast before back(): see CLAUDE.md Toasts (success checkmark timing).
      toast.success(t('premium.paywall.success'));
      router.back();
    }
  };

  const onRestore = async () => {
    if (busy) return;
    setBusy('restore');
    const result = await restore();
    setBusy(null);
    if (result.error) {
      toast.error(t('premium.paywall.error'));
      return;
    }
    refreshEntitlement();
    if (premiumInfoFrom(result.info).active) {
      toast.success(t('premium.paywall.restored'));
      router.back();
    } else {
      toast.info(t('premium.paywall.nothingToRestore'));
    }
  };

  return (
    <View className="flex-1 bg-background dark:bg-backgroundDark">
      <ScrollView contentContainerClassName="gap-6 px-5 pb-10 pt-4">
        <View className="items-center gap-3">
          <View className="h-16 w-16 items-center justify-center rounded-2xl bg-accentMuted dark:bg-primaryMutedDark">
            <Ionicons name="sparkles" size={30} color={colors.accent} />
          </View>
          <Text className="text-[13px] font-semibold uppercase tracking-wide text-accent dark:text-primaryDark">
            {t('premium.paywall.eyebrow')}
          </Text>
          <Text className="text-center text-title text-ink dark:text-white">{t(`premium.features.${feature}.title`)}</Text>
          <Text className="text-center text-body text-inkSecondary dark:text-gray">
            {t(`premium.features.${feature}.body`)}
          </Text>
        </View>

        <View className="gap-3 rounded-[18px] bg-surface p-4 dark:bg-surfaceDark">
          {BENEFITS.map((benefit) => (
            <View key={benefit.key} className="flex-row items-center gap-3">
              <Ionicons name={benefit.icon} size={20} color={colors.accent} />
              <Text className="flex-1 text-body text-ink dark:text-white">{t(`premium.paywall.benefits.${benefit.key}`)}</Text>
            </View>
          ))}
          <View className="mt-1 flex-row items-center gap-3">
            <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
            <Text className="flex-1 text-label text-inkSecondary dark:text-gray">{t('premium.paywall.subtitle')}</Text>
          </View>
        </View>

        {packages === null ? (
          <ActivityIndicator color={colors.primary} />
        ) : packages.length === 0 ? (
          <Text className="text-center text-label text-inkSecondary dark:text-gray">{t('premium.paywall.unavailable')}</Text>
        ) : (
          <View className="gap-3">
            {packages.map((pkg) => {
              const isSelected = pkg.identifier === selectedId;
              const isAnnual = pkg.packageType === 'ANNUAL';
              return (
                <Pressable
                  key={pkg.identifier}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: isSelected }}
                  onPress={() => {
                    if (!isSelected) haptics.tick();
                    setSelectedId(pkg.identifier);
                  }}
                  // Selection via style, never a className swap (NativeWind remount gotcha).
                  style={{ borderColor: isSelected ? colors.primary : 'transparent' }}
                  className="flex-row items-center gap-3 rounded-[18px] border-2 bg-surface p-4 dark:bg-surfaceDark"
                >
                  <Ionicons
                    name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                    size={22}
                    color={isSelected ? colors.primary : colors.gray}
                  />
                  <View className="flex-1 gap-0.5">
                    <View className="flex-row items-center gap-2">
                      <Text className="text-heading text-ink dark:text-white">
                        {isAnnual ? t('premium.paywall.annual') : t('premium.paywall.monthly')}
                      </Text>
                      {isAnnual && (
                        <View className="rounded-full bg-accentMuted px-2 py-0.5 dark:bg-primaryMutedDark">
                          <Text className="text-caption text-accent dark:text-primaryDark">{t('premium.paywall.bestValue')}</Text>
                        </View>
                      )}
                    </View>
                    {isAnnual && pkg.product.pricePerMonthString && (
                      <Text className="text-label text-inkSecondary dark:text-gray">
                        {t('premium.paywall.perMonth', { price: pkg.product.pricePerMonthString })}
                      </Text>
                    )}
                  </View>
                  <Text className="text-heading text-ink dark:text-white">{pkg.product.priceString}</Text>
                </Pressable>
              );
            })}
          </View>
        )}

        <View className="gap-3">
          <Pressable
            accessibilityRole="button"
            disabled={!selected || busy !== null}
            onPress={onPurchase}
            style={{ opacity: !selected ? 0.5 : 1 }}
            className="items-center rounded-full bg-primary py-4 active:opacity-90 dark:bg-primaryDark"
          >
            {busy === 'purchase' ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-nav text-white">
                {hasTrial ? t('premium.paywall.startTrial') : t('premium.paywall.continue')}
              </Text>
            )}
          </Pressable>
          {selected && (
            <Text className="text-center text-caption text-inkSecondary dark:text-gray">
              {hasTrial
                ? t('premium.paywall.trialTerms', { price: selected.product.priceString })
                : t('premium.paywall.terms')}
            </Text>
          )}
        </View>

        <View className="flex-row flex-wrap items-center justify-center gap-x-5 gap-y-2">
          <Pressable accessibilityRole="button" onPress={onRestore} disabled={busy !== null} hitSlop={8}>
            {busy === 'restore' ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <Text className="text-label font-semibold text-accent dark:text-primaryDark">{t('premium.paywall.restore')}</Text>
            )}
          </Pressable>
          <Pressable accessibilityRole="link" onPress={() => Linking.openURL(TERMS_URL)} hitSlop={8}>
            <Text className="text-label text-inkSecondary dark:text-gray">{t('premium.paywall.termsLink')}</Text>
          </Pressable>
          {!!PRIVACY_POLICY_URL && (
            <Pressable accessibilityRole="link" onPress={() => Linking.openURL(PRIVACY_POLICY_URL)} hitSlop={8}>
              <Text className="text-label text-inkSecondary dark:text-gray">{t('premium.paywall.privacyLink')}</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
