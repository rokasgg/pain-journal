import { Stack, useRouter, type Href } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { PremiumBadge } from '@/components/premium/PremiumBadge';
import { SettingsRow } from '@/components/settings/SettingsRow';
import { SettingsSection } from '@/components/settings/SettingsSection';
import { useExercises } from '@/hooks/useExercises';
import { usePremium } from '@/hooks/usePremium';
import { paywallHref } from '@/hooks/usePremiumAction';
import { usePresets } from '@/hooks/useRoutines';
import { formatCount } from '@/lib/i18n/plural';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { headerRightWithoutGlass } from '@/lib/navigation/headerItems';
import { colors } from '@/lib/theme';

// "My exercises": the library, the presets that pre-tick a set of it, and
// the (Premium) import from a physio sheet / visit / description. All of
// this except the import is free.
export default function MyExercisesScreen() {
  const router = useRouter();
  const { t, locale } = useTranslation();
  const { isPremium } = usePremium();
  const { exercises, isLoading: exercisesLoading } = useExercises();
  const { presets, isLoading: presetsLoading } = usePresets();
  const libraryIds = new Set(exercises.map((exercise) => exercise.id));

  if (exercisesLoading || presetsLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-background dark:bg-backgroundDark">
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={headerRightWithoutGlass(
          <Pressable
            onPress={() => router.push('/training/exercise/new' as Href)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={t('training.newExercise')}
          >
            <Ionicons name="add" size={28} color={colors.primary} />
          </Pressable>,
        )}
      />
      <ScrollView
        className="flex-1 bg-background dark:bg-backgroundDark"
        contentContainerClassName="gap-8 px-5 pb-12 pt-4"
      >
        <SettingsSection title={t('training.exercisesSection')} footer={t('training.exercisesFooter')}>
          {[
            ...exercises.map((exercise) => (
              <SettingsRow
                key={exercise.id}
                icon="barbell-outline"
                title={exercise.name}
                subtitle={[exercise.target_sets_reps, exercise.muscle_group].filter(Boolean).join(' · ') || undefined}
                onPress={() => router.push(`/training/exercise/${exercise.id}` as Href)}
              />
            )),
            <SettingsRow
              key="new"
              icon="add"
              title={t('training.newExercise')}
              onPress={() => router.push('/training/exercise/new' as Href)}
            />,
          ]}
        </SettingsSection>

        <SettingsSection title={t('training.presetsSection')} footer={t('training.presetsFooter')}>
          {[
            ...presets.map((preset) => {
              const count = formatCount(preset.exercise_ids.filter((id) => libraryIds.has(id)).length, 'exercise', locale);
              return (
                <SettingsRow
                  key={preset.id}
                  icon="albums-outline"
                  title={preset.title}
                  subtitle={preset.in_rotation ? count : `${count} · ${t('training.hiddenBadge')}`}
                  onPress={() => router.push(`/training/preset/${preset.id}` as Href)}
                />
              );
            }),
            <SettingsRow
              key="new"
              icon="add"
              title={t('training.newPreset')}
              onPress={() => router.push('/training/preset/new' as Href)}
            />,
          ]}
        </SettingsSection>

        <SettingsSection footer={t('training.importBody')}>
          <SettingsRow
            icon="document-text-outline"
            title={t('training.importTitle')}
            accessory={isPremium ? undefined : <PremiumBadge />}
            onPress={() => router.push((isPremium ? '/routine/new' : paywallHref('routines')) as Href)}
          />
        </SettingsSection>

        <Pressable
          onPress={() => router.push('/training/log' as Href)}
          className="items-center rounded-xl bg-primary py-4 active:opacity-90 dark:bg-primaryDark"
        >
          <Text className="text-nav text-white">{t('training.logTraining')}</Text>
        </Pressable>
      </ScrollView>
    </>
  );
}
