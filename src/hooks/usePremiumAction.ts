import { useRouter, type Href } from 'expo-router';
import { useCallback } from 'react';

import { usePremium } from '@/hooks/usePremium';
import type { PremiumFeature } from '@/lib/premium';

export function paywallHref(feature: PremiumFeature): Href {
  return `/paywall?feature=${feature}` as Href;
}

/**
 * For buttons that start a Premium action: runs `action` for Premium users,
 * otherwise opens the paywall for `feature`. Returns `isPremium` too so the
 * caller can draw a lock badge.
 */
export function usePremiumAction(feature: PremiumFeature) {
  const { isPremium } = usePremium();
  const router = useRouter();

  const run = useCallback(
    (action: () => void) => {
      if (isPremium) action();
      else router.push(paywallHref(feature));
    },
    [isPremium, router, feature],
  );

  const openPaywall = useCallback(() => router.push(paywallHref(feature)), [router, feature]);

  return { isPremium, run, openPaywall };
}
