import * as Haptics from 'expo-haptics';

import { useHapticsStore } from '@/store/useHapticsStore';

// The app's whole vibration vocabulary — the only file allowed to import
// expo-haptics, so the same meaning always feels the same everywhere.
// Vibrate on: a choice made, a value stepping, an action finishing, a
// warning. Never on: scrolling, typing, plain navigation, every button.

const CHECKIN_BEATS = 3;
const CHECKIN_BEAT_INTERVAL_MS = 140;

function run(effect: () => Promise<void>) {
  if (!useHapticsStore.getState().enabled) return;
  effect().catch(() => {});
}

export const haptics = {
  /** A value/option changed: slider steps, chips, yes/no, segmented controls, tabs, switches. */
  tick: () => run(() => Haptics.selectionAsync()),
  /** Wizard Next/Back/Continue — the "page turn". Not for final Save buttons. */
  tap: () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  /** Long-press that opens an action sheet. */
  press: () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  /** An action actually finished (fire after the save resolves, never on tap). */
  success: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  /** A destructive confirmation is being asked. */
  warning: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
  /** Something failed. */
  error: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
  /** One drop from the watering can landing (training celebration only). */
  waterDrop: () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  /** The flash as the oak grows a stage (check-in milestone). */
  grow: () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  /** Signature pattern, check-in completion only: three soft beats as the sun or moon lands. */
  checkin: () => {
    for (let i = 0; i < CHECKIN_BEATS; i++) {
      setTimeout(() => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft)), i * CHECKIN_BEAT_INTERVAL_MS);
    }
  },
};
