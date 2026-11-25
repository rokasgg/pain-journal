import { Platform } from 'react-native';

import { PREMIUM_ENTITLEMENT } from '@/lib/premium';

// The only file allowed to import react-native-purchases (RevenueCat). It's
// loaded with a guarded dynamic import(), so Expo Go, Android (not set up
// yet) and builds made before the native module was added report
// "unavailable" instead of crashing — same idea as lib/health/healthkit.ts.
// Every call returns `{ …, error }` and never throws.

type PurchasesModule = typeof import('react-native-purchases');
type PurchasesClass = PurchasesModule['default'];
export type CustomerInfo = import('react-native-purchases').CustomerInfo;
export type PurchasesPackage = import('react-native-purchases').PurchasesPackage;

const IOS_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY;

let modulePromise: Promise<PurchasesClass | null> | null = null;
let configured = false;
let currentUserId: string | null = null;

function loadPurchases(): Promise<PurchasesClass | null> {
  if (Platform.OS !== 'ios') return Promise.resolve(null);
  if (!IOS_KEY) {
    if (__DEV__) console.warn('EXPO_PUBLIC_REVENUECAT_IOS_KEY is missing; purchases are disabled.');
    return Promise.resolve(null);
  }
  // RevenueCat Test Store keys (test_…) only simulate purchases. Never let one
  // reach a TestFlight/App Store build: use the appl_… key there.
  if (IOS_KEY.startsWith('test_') && !__DEV__) {
    console.warn('RevenueCat Test Store key in a release build; purchases are disabled.');
    return Promise.resolve(null);
  }
  modulePromise ??= import('react-native-purchases')
    .then((mod) => mod.default ?? null)
    .catch(() => null);
  return modulePromise;
}

async function ready(): Promise<PurchasesClass | null> {
  const Purchases = await loadPurchases();
  return Purchases && configured ? Purchases : null;
}

export interface PremiumInfo {
  active: boolean;
  isTrial: boolean;
  expiresAt: string | null;
  willRenew: boolean;
}

export function premiumInfoFrom(info: CustomerInfo | null): PremiumInfo {
  const ent = info?.entitlements.active[PREMIUM_ENTITLEMENT];
  return {
    active: !!ent?.isActive,
    isTrial: ent?.periodType === 'TRIAL',
    expiresAt: ent?.expirationDate ?? null,
    willRenew: !!ent?.willRenew,
  };
}

/** Configure once, or switch user. Call with the Supabase user id on sign-in. */
export async function identify(userId: string): Promise<{ error: string | null }> {
  const Purchases = await loadPurchases();
  if (!Purchases) return { error: 'unavailable' };
  try {
    if (!configured) {
      Purchases.configure({ apiKey: IOS_KEY!, appUserID: userId });
      configured = true;
    } else if (currentUserId !== userId) {
      await Purchases.logIn(userId);
    }
    currentUserId = userId;
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'unknown' };
  }
}

export async function resetIdentity(): Promise<void> {
  const Purchases = await ready();
  if (!Purchases) return;
  try {
    if (!(await Purchases.isAnonymous())) await Purchases.logOut();
    currentUserId = null;
  } catch {
    // Best effort: a stale identity just gets replaced on the next logIn.
  }
}

export async function getCustomerInfo(): Promise<CustomerInfo | null> {
  const Purchases = await ready();
  if (!Purchases) return null;
  try {
    return await Purchases.getCustomerInfo();
  } catch {
    return null;
  }
}

/** Pushes every CustomerInfo change (purchase, renewal, restore). Returns unsubscribe. */
export async function onCustomerInfoChange(listener: (info: CustomerInfo) => void): Promise<() => void> {
  const Purchases = await ready();
  if (!Purchases) return () => {};
  Purchases.addCustomerInfoUpdateListener(listener);
  return () => {
    Purchases.removeCustomerInfoUpdateListener(listener);
  };
}

export async function getPackages(): Promise<{ packages: PurchasesPackage[]; error: string | null }> {
  const Purchases = await ready();
  if (!Purchases) return { packages: [], error: 'unavailable' };
  try {
    const offerings = await Purchases.getOfferings();
    return { packages: offerings.current?.availablePackages ?? [], error: null };
  } catch (e) {
    return { packages: [], error: e instanceof Error ? e.message : 'unknown' };
  }
}

export async function purchase(
  pkg: PurchasesPackage,
): Promise<{ info: CustomerInfo | null; cancelled: boolean; error: string | null }> {
  const Purchases = await ready();
  if (!Purchases) return { info: null, cancelled: false, error: 'unavailable' };
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return { info: customerInfo, cancelled: false, error: null };
  } catch (e) {
    const cancelled = typeof e === 'object' && e !== null && (e as { userCancelled?: boolean }).userCancelled === true;
    return { info: null, cancelled, error: cancelled ? null : e instanceof Error ? e.message : 'unknown' };
  }
}

export async function restore(): Promise<{ info: CustomerInfo | null; error: string | null }> {
  const Purchases = await ready();
  if (!Purchases) return { info: null, error: 'unavailable' };
  try {
    return { info: await Purchases.restorePurchases(), error: null };
  } catch (e) {
    return { info: null, error: e instanceof Error ? e.message : 'unknown' };
  }
}

export async function showManageSubscriptions(): Promise<boolean> {
  const Purchases = await ready();
  if (!Purchases) return false;
  try {
    await Purchases.showManageSubscriptions();
    return true;
  } catch {
    return false;
  }
}
