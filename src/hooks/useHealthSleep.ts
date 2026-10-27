import type { HealthSleep } from '@/lib/sleep';

// Last night's sleep from Apple Health, for the morning check-in's "Kiek
// miegojote?" card (design: "Rytas – miegas (Apple Sveikata)").
//
// Not wired to HealthKit yet: it needs a native module (+ config plugin,
// HealthKit entitlement, NSHealthShareUsageDescription and a dev/EAS build),
// so for now this returns null and the card shows the plain −/+ stepper. When
// the integration lands, return the sample here — the card, the form's
// prefill and the "Pataisyti" flow already handle it.
export function useHealthSleep(): HealthSleep | null {
  return null;
}
