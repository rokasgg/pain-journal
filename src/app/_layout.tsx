import '../../global.css';

import { QueryClientProvider } from '@tanstack/react-query';
import { Stack, useRouter, useSegments, type Href } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';

import { AppSplashScreen } from '@/components/AppSplashScreen';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { WateringCelebrationHost } from '@/components/WateringCelebrationHost';
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

function RootLayoutNav() {
  const { session, isLoading } = useSession();
  const { profile, isLoading: profileLoading } = useProfile();
  const { isLoading: todayLoading } = useTodayCheckins();
  const { t } = useTranslation();
  const segments = useSegments();
  const router = useRouter();
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  const isDark = useColorScheme() === 'dark';

  useSyncReminderNotifications();

  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => setMinTimeElapsed(true), MIN_SPLASH_MS);
    return () => clearTimeout(timeout);
  }, []);

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
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen
          name="modal/edit-profile"
          options={{ presentation: 'modal', headerShown: true, title: t('screenTitles.editProfile') }}
        />
        <Stack.Screen
          name="modal/injury-info"
          options={{
            headerShown: true, title: t('screenTitles.injuryInfo'), headerBackButtonDisplayMode: 'minimal',
            headerStyle: { backgroundColor: isDark ? colors.backgroundDark : colors.background },
            headerShadowVisible: false,
          }}
        />
        <Stack.Screen
          name="modal/notifications"
          options={{ presentation: 'modal', headerShown: true, title: t('screenTitles.notifications') }}
        />
        <Stack.Screen
          name="checkin/[type]"
          options={{
            headerShown: true, title: t('screenTitles.checkin'),
            headerBackTitle: t('tabs.home'),
            headerBackButtonDisplayMode: 'minimal',
            headerStyle: { backgroundColor: isDark ? colors.backgroundDark : colors.background },
            headerShadowVisible: false,
          }}

        />
        <Stack.Screen
          name="checkin/backfill"
          options={{
            headerShown: true, title: t('screenTitles.backfillCheckin'), headerBackTitle: t('tabs.home'), headerBackButtonDisplayMode: 'minimal',
            headerStyle: { backgroundColor: isDark ? colors.backgroundDark : colors.background },
            headerShadowVisible: false,
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
            headerStyle: { backgroundColor: isDark ? colors.backgroundDark : colors.background },
            headerShadowVisible: false,
          }}
        />
        <Stack.Screen
          name="flare-up/edit/[id]"
          options={{
            presentation: 'modal', headerShown: true, title: t('screenTitles.editFlareUp'),
            headerStyle: { backgroundColor: isDark ? colors.backgroundDark : colors.background },
            headerShadowVisible: false,
          }}
        />
        <Stack.Screen
          name="history/[kind]/[id]"
          options={{ presentation: 'modal', headerShown: true, title: t('screenTitles.entryDetails'), }}
        />
        <Stack.Screen
          name="history/day/[date]"
          options={{ presentation: 'modal', headerShown: true, title: t('screenTitles.dayDetails') }}
        />
        <Stack.Screen
          name="history/patterns"
          options={{ presentation: 'modal', headerShown: true, title: t('screenTitles.patternAnalysis') }}
        />
        <Stack.Screen
          name="history/physio-summary"
          options={{
            headerShown: true,
            title: t('screenTitles.physioSummary'),
            headerBackTitle: '',
            headerBackButtonDisplayMode: 'minimal',
            headerStyle: { backgroundColor: isDark ? colors.backgroundDark : colors.background },
            headerShadowVisible: false,
          }}
        />
        <Stack.Screen name="physio-visit/new" options={{ headerShown: false }} />
        <Stack.Screen
          name="physio-visit/edit/[id]"
          options={{ presentation: 'modal', headerShown: true, title: t('screenTitles.editPhysioVisit') }}
        />
        <Stack.Screen
          name="physio-visit/[id]"
          options={{
            headerShown: true,
            title: t('screenTitles.physioVisitDetails'),
            headerBackTitle: '',
            headerBackButtonDisplayMode: 'minimal',
            headerStyle: { backgroundColor: isDark ? colors.backgroundDark : colors.background },
            headerShadowVisible: false,
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
            headerStyle: { backgroundColor: isDark ? colors.backgroundDark : colors.background },
            headerShadowVisible: false,
          }}
        />
        <Stack.Screen
          name="insights/chat"
          options={{
            headerShown: true,
            title: t('screenTitles.aiChat'),
            headerBackTitle: t('tabs.insights'),
            headerBackButtonDisplayMode: 'minimal',
            headerStyle: { backgroundColor: isDark ? colors.backgroundDark : colors.background },
            headerShadowVisible: false,
          }}
        />
      </Stack>
      <ToastModalHost />
      <WateringCelebrationHost />
    </ErrorBoundary>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <RootLayoutNav />
    </QueryClientProvider>
  );
}
