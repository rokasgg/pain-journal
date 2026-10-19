import '../../global.css';

import { QueryClientProvider } from '@tanstack/react-query';
import { Stack, useRouter, useSegments, type Href } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useRef, useState } from 'react';
import { Platform, useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AppSplashScreen } from '@/components/AppSplashScreen';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { HeaderBackButton } from '@/components/ui/HeaderBackButton';
import { WateringCelebrationHost } from '@/components/WateringCelebrationHost';
import { KeyboardDoneBar } from '@/components/ui/KeyboardDoneBar';
import { ToastModalHost } from '@/components/ui/ToastModalHost';
import { useTodayCheckins } from '@/hooks/useCheckins';
import { useProfile } from '@/hooks/useProfile';
import { useSession } from '@/hooks/useSession';
import { useSyncReminderNotifications } from '@/hooks/useSyncReminderNotifications';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { queryClient } from '@/lib/queryClient';
import { colors } from '@/lib/theme';

SplashScreen.preventAutoHideAsync().catch(() => { });

const MIN_SPLASH_MS = 3000;

// Routes presented as modal sheets (`presentation: 'modal'` below). They have
// no back button, so they don't get the custom iOS back item. Keep in sync
// when changing a screen's presentation.
const MODAL_SHEET_ROUTES = new Set([
  'flare-up/edit/[id]',
  'history/[kind]/[id]',
  'history/day/[date]',
  'history/patterns',
  'physio-visit/edit/[id]',
]);

function RootLayoutNav() {
  const { session, isLoading } = useSession();
  const { profile, isLoading: profileLoading } = useProfile();
  const { isLoading: todayLoading } = useTodayCheckins();
  const { t } = useTranslation();
  const segments = useSegments();
  const router = useRouter();
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  const isDark = useColorScheme() === 'dark';
  // Tracks whether the *previous* render had a session, so we can tell a
  // fresh sign-in (null -> session) apart from every other re-render.
  const wasAuthenticatedRef = useRef(false);

  useSyncReminderNotifications();

  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => setMinTimeElapsed(true), MIN_SPLASH_MS);
    return () => clearTimeout(timeout);
  }, []);

  // Re-run the minimum-splash-time gate on every fresh sign-in, not just on
  // cold app boot. Without this, the timer (started once above) has almost
  // always already elapsed by the time someone finishes typing their
  // credentials and taps "Log In" — so the splash barely flashed on the
  // login -> tabs transition even though it's the same handoff the cold-boot
  // splash was built for.
  useEffect(() => {
    const isAuthenticated = !!session;
    if (isAuthenticated && !wasAuthenticatedRef.current) {
      setMinTimeElapsed(false);
      const timeout = setTimeout(() => setMinTimeElapsed(true), MIN_SPLASH_MS);
      wasAuthenticatedRef.current = true;
      return () => clearTimeout(timeout);
    }
    wasAuthenticatedRef.current = isAuthenticated;
  }, [session]);

  useEffect(() => {
    if (isLoading || profileLoading) return;

    const isAuthenticated = !!session;
    const inAuthGroup = segments[0] === '(auth)';
    // Cast to string: expo-router's generated route types don't include this
    // new top-level route yet (same workaround as other new routes elsewhere
    // in this codebase, e.g. history/physio-visits.tsx).
    const inOnboarding = (segments[0] as string) === 'onboarding';
    // profile is auto-created by the on_auth_user_created DB trigger, so once
    // authenticated it should exist; treat a still-missing row as "not
    // onboarded yet" rather than crashing the redirect logic.
    const needsOnboarding = isAuthenticated && !profile?.onboarding_completed;

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      router.replace((needsOnboarding ? '/onboarding' : '/(tabs)') as Href);
    } else if (needsOnboarding && !inOnboarding) {
      router.replace('/onboarding' as Href);
    } else if (!needsOnboarding && inOnboarding) {
      router.replace('/(tabs)');
    }
  }, [session, isLoading, profile, profileLoading, segments, router]);

  const showSplash = isLoading || profileLoading || todayLoading || !minTimeElapsed;

  if (showSplash) {
    return <AppSplashScreen />;
  }

  return (
    <ErrorBoundary>
      <Stack
        screenOptions={({ route, navigation }) => ({
          headerShown: false,
          // Explicit (not native-stack's implicit 'default') so plain-push
          // screens slide the same way on iOS and Android — Android's
          // implicit default can render as an inconsistent fade/scale
          // depending on OS/RN Screens version.
          animation: 'slide_from_right',
          // Every header blends into the screen behind it: same colour as
          // the page background, no hairline. (Deliberately not
          // `headerTransparent`, which floats the header over content that
          // doesn't inset for it.)
          headerStyle: { backgroundColor: isDark ? colors.backgroundDark : colors.background },
          headerShadowVisible: false,
          headerTintColor: colors.primary,
          headerTitleStyle: { color: isDark ? colors.white : colors.black },
          // iOS 26 draws a "Liquid Glass" bubble behind the native back
          // button that can't be turned off; a custom item with
          // hidesSharedBackground can. Skipped on modal sheets (no back
          // button there — they swipe down to close).
          ...(Platform.OS === 'ios' && navigation.canGoBack() && !MODAL_SHEET_ROUTES.has(route.name)
            ? {
                unstable_headerLeftItems: () => [
                  {
                    type: 'custom' as const,
                    element: (
                      <HeaderBackButton
                        label={route.name.startsWith('settings/') ? t('tabs.settings') : undefined}
                      />
                    ),
                    hidesSharedBackground: true,
                  },
                ],
              }
            : {}),
        })}
      >
        {/* Reached via router.replace (auth/onboarding/tabs mode switches),
            not a user-initiated push — a directional slide would misread as
            "entering a sub-page", so fade instead. */}
        <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
        <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
        <Stack.Screen name="(auth)" options={{ animation: 'fade' }} />
        {/* Pushed like every other settings sub-page; Save lives in the
            screen's own headerRight (set via Stack.Screen options there). */}
        <Stack.Screen
          name="settings/edit-profile"
          options={{
            headerShown: true,
            title: t('screenTitles.editProfile'),
            headerBackTitle: t('tabs.settings'),
          }}
        />
        <Stack.Screen
          name="settings/injury-info"
          options={{
            headerShown: true,
            title: t('screenTitles.injuryInfo'),
            headerBackTitle: t('tabs.settings'),
          }}
        />
        {/* Settings sub-pages (src/app/settings/) are pushed pages with a
            "‹ Settings" back button, not modal sheets — the new settings design. */}
        <Stack.Screen
          name="settings/language"
          options={{
            headerShown: true,
            title: t('screenTitles.language'),
            headerBackTitle: t('tabs.settings'),
          }}
        />
        <Stack.Screen
          name="settings/notifications"
          options={{
            headerShown: true,
            title: t('screenTitles.notifications'),
            headerBackTitle: t('tabs.settings'),
          }}
        />
        <Stack.Screen
          name="checkin/[type]"
          options={{
            headerShown: true, title: t('screenTitles.checkin'),
            headerBackTitle: t('tabs.home'),
            headerBackButtonDisplayMode: 'minimal',
          }}

        />
        <Stack.Screen
          name="checkin/backfill"
          options={{
            headerShown: true, title: t('screenTitles.backfillCheckin'), headerBackTitle: t('tabs.home'), headerBackButtonDisplayMode: 'minimal',
          }}
        />
        <Stack.Screen
          name="checkin/edit/[id]"
          options={{ headerShown: true, title: t('screenTitles.editCheckin') }}
        />
        <Stack.Screen
          name="flare-up/new"
          options={{
            headerShown: true, title: t('screenTitles.logFlareUp'), headerBackTitle: t('tabs.home'), headerBackButtonDisplayMode: 'minimal',
          }}
        />
        <Stack.Screen
          name="flare-up/edit/[id]"
          options={{
            presentation: 'modal', animation: 'slide_from_bottom', headerShown: true, title: t('screenTitles.editFlareUp'),
          }}
        />
        <Stack.Screen
          name="history/[kind]/[id]"
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
            headerShown: true,
            title: t('screenTitles.entryDetails'),
          }}
        />
        <Stack.Screen
          name="history/day/[date]"
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
            headerShown: true,
            title: t('screenTitles.dayDetails'),
          }}
        />
        <Stack.Screen
          name="history/patterns"
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
            headerShown: true,
            title: t('screenTitles.patternAnalysis'),
          }}
        />
        <Stack.Screen
          name="history/physio-summary"
          options={{
            headerShown: true,
            title: t('screenTitles.physioSummary'),
            headerBackTitle: '',
            headerBackButtonDisplayMode: 'minimal',
          }}
        />
        {/* Immersive story takeover, not a form sheet — fullScreenModal (no
            swipe-to-dismiss sheet chrome) + fade, closed via its own ✕. */}
        <Stack.Screen
          name="wrap/[month]"
          options={{ presentation: 'fullScreenModal', animation: 'fade', headerShown: false }}
        />
        <Stack.Screen
          name="routine/complete/[id]"
          options={{
            headerShown: true,
            title: t('screenTitles.completeRoutine'),
            headerBackButtonDisplayMode: 'minimal',
          }}
        />
        <Stack.Screen
          name="routine/new"
          options={{
            headerShown: true,
            title: t('screenTitles.newRoutine'),
            headerBackButtonDisplayMode: 'minimal',
          }}
        />
        <Stack.Screen
          name="routine/review"
          options={{
            headerShown: true,
            title: t('screenTitles.reviewRoutine'),
            headerBackButtonDisplayMode: 'minimal',
          }}
        />
        <Stack.Screen
          name="routine/[id]"
          options={{
            headerShown: true,
            title: t('screenTitles.viewRoutine'),
            headerBackButtonDisplayMode: 'minimal',
          }}
        />
        <Stack.Screen
          name="routine/edit/[id]"
          options={{
            headerShown: true,
            title: t('screenTitles.editRoutine'),
            headerBackButtonDisplayMode: 'minimal',
          }}
        />
        <Stack.Screen
          name="routine/view"
          options={{
            headerShown: true,
            title: t('screenTitles.routineHistory'),
            headerBackButtonDisplayMode: 'minimal',
          }}
        />
        <Stack.Screen name="physio-visit/new" options={{ headerShown: false }} />
        <Stack.Screen
          name="physio-visit/edit/[id]"
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
            headerShown: true,
            title: t('screenTitles.editPhysioVisit'),
          }}
        />
        <Stack.Screen
          name="physio-visit/[id]"
          options={{
            headerShown: true,
            title: t('screenTitles.physioVisitDetails'),
            headerBackTitle: '',
            headerBackButtonDisplayMode: 'minimal',
          }}
        />
        <Stack.Screen
          name="history/physio-visits"
          options={{
            headerShown: true,
            title: t('screenTitles.physioVisits'),
            headerBackTitle: t('tabs.home'),
          }}
        />
        <Stack.Screen
          name="history/physio-focus"
          options={{
            headerShown: true,
            title: t('screenTitles.physioFocusDetail'),
            headerBackTitle: t('tabs.insights'),
            headerBackButtonDisplayMode: 'minimal',
          }}
        />
        <Stack.Screen
          name="insights/chat"
          options={{
            headerShown: true,
            title: t('screenTitles.aiChat'),
            headerBackTitle: t('tabs.insights'),
            headerBackButtonDisplayMode: 'minimal',
          }}
        />
      </Stack>
      <ToastModalHost />
      <WateringCelebrationHost />
      <KeyboardDoneBar />
    </ErrorBoundary>
  );
}

export default function RootLayout() {
  return (
    // Required for any react-native-gesture-handler gesture (e.g. the
    // PainTrendChart scrubber) — expo-router doesn't mount one itself.
    // `style` rather than className: GestureHandlerRootView isn't a
    // NativeWind-interop'd component.
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <RootLayoutNav />
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
