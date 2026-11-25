import type { ReactNode } from 'react';

import { LockedCard } from '@/components/premium/LockedCard';
import { usePremium } from '@/hooks/usePremium';
import type { PremiumFeature } from '@/lib/premium';

export interface PremiumGateProps {
  feature: PremiumFeature;
  children: ReactNode;
  /** Replaces the default LockedCard (e.g. a teaser). `null` renders nothing. */
  fallback?: ReactNode;
  lockedTitle?: string;
  className?: string;
}

// Renders `children` for Premium users; otherwise a LockedCard (or `fallback`).
export function PremiumGate({ feature, children, fallback, lockedTitle, className }: PremiumGateProps) {
  const { isPremium } = usePremium();
  if (isPremium) return <>{children}</>;
  if (fallback !== undefined) return <>{fallback}</>;
  return <LockedCard feature={feature} title={lockedTitle} className={className} />;
}
