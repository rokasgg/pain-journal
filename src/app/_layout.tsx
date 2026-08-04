import '../../global.css';

import { QueryClientProvider } from '@tanstack/react-query';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useSession } from '@/hooks/useSession';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { queryClient } from '@/lib/queryClient';

function RootLayoutNav() {
  const { session, isLoading } = useSession();
  const { t } = useTranslation();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const isAuthenticated = !!session;
    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [session, isLoading, segments, router]);

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-background dark:bg-backgroundDark">
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen
          name="modal/edit-profile"
          options={{ presentation: 'modal', headerShown: true, title: t('screenTitles.editProfile') }}
        />
        <Stack.Screen
          name="checkin/[type]"
          options={{ presentation: 'modal', headerShown: true, title: t('screenTitles.checkin') }}
        />
        <Stack.Screen
          name="checkin/backfill"
          options={{ presentation: 'modal', headerShown: true, title: t('screenTitles.backfillCheckin') }}
        />
        <Stack.Screen
          name="checkin/edit/[id]"
          options={{ presentation: 'modal', headerShown: true, title: t('screenTitles.editCheckin') }}
        />
        <Stack.Screen
          name="flare-up/new"
          options={{ presentation: 'modal', headerShown: true, title: t('screenTitles.logFlareUp') }}
        />
        <Stack.Screen
          name="flare-up/edit/[id]"
          options={{ presentation: 'modal', headerShown: true, title: t('screenTitles.editFlareUp') }}
        />
        <Stack.Screen
          name="history/[kind]/[id]"
          options={{ presentation: 'modal', headerShown: true, title: t('screenTitles.entryDetails') }}
        />
        <Stack.Screen
          name="history/day/[date]"
          options={{ presentation: 'modal', headerShown: true, title: t('screenTitles.dayDetails') }}
        />
        <Stack.Screen
          name="history/patterns"
          options={{ presentation: 'modal', headerShown: true, title: t('screenTitles.patternAnalysis') }}
        />
      </Stack>
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
