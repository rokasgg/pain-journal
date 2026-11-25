import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

import { useSession } from '@/hooks/useSession';
import { isActiveEntitlement } from '@/lib/premium';
import {
  getCustomerInfo,
  identify,
  onCustomerInfoChange,
  premiumInfoFrom,
  resetIdentity,
  type PremiumInfo,
} from '@/lib/purchases';
import { supabase } from '@/lib/supabase';
import { usePremiumDevStore } from '@/store/usePremiumDevStore';
import type { Subscription } from '@/types/database.types';

// Premium entitlement, from two sources (either one being active counts):
//   * RevenueCat's CustomerInfo: instant right after a purchase/restore, and
//     cached on the device.
//   * the `subscriptions` row (written by the revenuecat-webhook function):
//     the same truth the AI edge functions check server-side.
// Lives in the TanStack Query cache like the session; usePremiumLifecycle()
// (root layout) pushes RevenueCat updates into it.

interface PremiumData {
  rc: PremiumInfo;
  row: Subscription | null;
}

export const premiumQueryKey = (userId: string | undefined) => ['premium', userId] as const;

async function fetchPremium(userId: string): Promise<PremiumData> {
  await identify(userId);
  const [info, rowResult] = await Promise.all([
    getCustomerInfo(),
    supabase.from('subscriptions').select('*').eq('user_id', userId).maybeSingle(),
  ]);
  // A missing table (migration not run yet) just means "no row".
  return { rc: premiumInfoFrom(info), row: (rowResult.data as Subscription | null) ?? null };
}

export interface PremiumState {
  isPremium: boolean;
  isTrial: boolean;
  expiresAt: string | null;
  willRenew: boolean;
  isLoading: boolean;
}

export function usePremium(): PremiumState {
  const { user } = useSession();
  const override = usePremiumDevStore((s) => s.override);

  const { data, isLoading } = useQuery({
    queryKey: premiumQueryKey(user?.id),
    queryFn: () => fetchPremium(user!.id),
    enabled: !!user,
    staleTime: 5 * 60_000,
  });

  if (__DEV__ && override !== 'off') {
    return { isPremium: override === 'premium', isTrial: false, expiresAt: null, willRenew: false, isLoading: false };
  }

  if (!data) {
    // While loading, report unlocked (like useJourney) so Premium users never
    // see locks flash on. The AI functions enforce it server-side anyway.
    return { isPremium: isLoading, isTrial: false, expiresAt: null, willRenew: false, isLoading };
  }

  const rowActive = isActiveEntitlement(data.row);
  return {
    isPremium: data.rc.active || rowActive,
    isTrial: data.rc.active ? data.rc.isTrial : data.row?.period_type === 'trial',
    expiresAt: data.rc.expiresAt ?? data.row?.expires_at ?? null,
    willRenew: data.rc.active ? data.rc.willRenew : !!data.row?.will_renew,
    isLoading: false,
  };
}

/** Called once from the root layout: keeps RevenueCat's identity and updates in sync. */
export function usePremiumLifecycle() {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const userId = user?.id;
  const hadUserRef = useRef(false);

  useEffect(() => {
    if (!userId) {
      if (hadUserRef.current) resetIdentity();
      hadUserRef.current = false;
      return;
    }
    hadUserRef.current = true;
    let unsubscribe: (() => void) | null = null;
    let cancelled = false;
    identify(userId).then(() =>
      onCustomerInfoChange((info) => {
        queryClient.setQueryData<PremiumData>(premiumQueryKey(userId), (prev) => ({
          rc: premiumInfoFrom(info),
          row: prev?.row ?? null,
        }));
      }).then((off) => {
        if (cancelled) off();
        else unsubscribe = off;
      }),
    );
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [userId, queryClient]);
}
