import { focusManager } from '@tanstack/react-query';
import { useRouter, useSegments, type Href } from 'expo-router';
import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { useSession } from '@/hooks/useSession';
import { EVENING_UNLOCK_HOUR } from '@/lib/checkinTiming';
import { msUntilNextHour, todayLocalDate } from '@/lib/dates';
import { useTodayStore } from '@/store/useTodayStore';

// What happens when the app comes back from the background (called once,
// from the root layout):
//  * TanStack Query is told about focus, so stale queries refetch on resume
//    (React Native has no window focus event; it must be wired to AppState).
//  * "Today" and the clock are re-read (useTodayStore), and again at
//    midnight and at the evening unlock while the app stays open.
//  * If a new day started while the app was away, open screens are closed
//    and the user lands on Home: yesterday's half-filled check-in would save
//    under the wrong day anyway. On the same day nothing moves.
// The Supabase token refresh follows AppState in src/lib/supabase.ts.
export function useAppLifecycle() {
  const { session } = useSession();
  const segments = useSegments();
  const router = useRouter();
  const leftOnDayRef = useRef<string | null>(null);

  // Read inside the AppState listener, which is registered once.
  const navStateRef = useRef({ signedIn: !!session, inApp: false });
  const inApp = segments[0] !== '(auth)' && segments[0] !== 'onboarding';
  useEffect(() => {
    navStateRef.current = { signedIn: !!session, inApp };
  }, [session, inApp]);

  useEffect(() => {
    const onChange = (state: AppStateStatus) => {
      focusManager.setFocused(state === 'active');

      if (state !== 'active') {
        leftOnDayRef.current ??= todayLocalDate();
        return;
      }

      const leftOn = leftOnDayRef.current;
      leftOnDayRef.current = null;
      useTodayStore.getState().refresh();

      const { signedIn, inApp: isInApp } = navStateRef.current;
      if (leftOn && leftOn !== todayLocalDate() && signedIn && isInApp) {
        if (router.canDismiss()) router.dismissAll();
        // '/' is (tabs)/index: Home itself, not whichever tab was last open.
        router.navigate('/' as Href);
      }
    };

    const subscription = AppState.addEventListener('change', onChange);
    return () => subscription.remove();
  }, [router]);

  // Midnight and the evening unlock while the app is open: flip in place.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const arm = () => {
      const wait = Math.min(msUntilNextHour(0), msUntilNextHour(EVENING_UNLOCK_HOUR));
      timer = setTimeout(() => {
        useTodayStore.getState().refresh();
        arm();
      }, wait);
    };
    arm();
    return () => clearTimeout(timer);
  }, []);
}
