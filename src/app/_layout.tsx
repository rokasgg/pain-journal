import '../../global.css';

import { QueryClientProvider } from '@tanstack/react-query';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useSession } from '@/hooks/useSession';
import { queryClient } from '@/lib/queryClient';

function RootLayoutNav() {
  const { session, isLoading } = useSession();
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
      <View className="flex-1 items-center justify-center bg-white dark:bg-black">
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
          options={{ presentation: 'modal', headerShown: true, title: 'Edit Profile' }}
        />
        <Stack.Screen
          name="checkin/[type]"
          options={{ presentation: 'modal', headerShown: true, title: 'Check-in' }}
        />
        <Stack.Screen
          name="checkin/backfill"
          options={{ presentation: 'modal', headerShown: true, title: 'Backfill Check-in' }}
        />
        <Stack.Screen
          name="checkin/edit/[id]"
          options={{ presentation: 'modal', headerShown: true, title: 'Edit Check-in' }}
        />
        <Stack.Screen
          name="flare-up/new"
          options={{ presentation: 'modal', headerShown: true, title: 'Log Flare-up' }}
        />
        <Stack.Screen
          name="flare-up/edit/[id]"
          options={{ presentation: 'modal', headerShown: true, title: 'Edit Flare-up' }}
        />
        <Stack.Screen
          name="history/[kind]/[id]"
          options={{ presentation: 'modal', headerShown: true, title: 'Entry Details' }}
        />
        <Stack.Screen
          name="history/day/[date]"
          options={{ presentation: 'modal', headerShown: true, title: 'Day Details' }}
        />
        <Stack.Screen
          name="history/patterns"
          options={{ presentation: 'modal', headerShown: true, title: 'Pattern Analysis' }}
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
