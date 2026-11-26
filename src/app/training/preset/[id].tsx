import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Switch, Text, View } from 'react-native';

import { HeaderSaveButton } from '@/components/training/HeaderSaveButton';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { Input } from '@/components/ui/Input';
import { useExercises } from '@/hooks/useExercises';
import { useCreatePreset, useDeletePreset, usePreset, useSetPresetShown, useUpdatePreset } from '@/hooks/useRoutines';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { headerRightWithoutGlass } from '@/lib/navigation/headerItems';
import { colors } from '@/lib/theme';
import { haptics } from '@/utils/haptics';
import { toast } from '@/utils/toast';

// Add (`id` = "new") or edit a preset: a name plus which library exercises
// it pre-ticks when logging. "Show when logging" hides an old program's chip
// without deleting it. Deleting keeps the exercises and every logged workout.
export default function PresetEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'new';
  const router = useRouter();
  const { t } = useTranslation();
  const { preset, isLoading } = usePreset(isNew ? undefined : id);
  const { exercises, isLoading: exercisesLoading } = useExercises();
  const createPreset = useCreatePreset();
  const updatePreset = useUpdatePreset();
  const setShown = useSetPresetShown();
  const deletePreset = useDeletePreset();

  const [titleOverride, setTitleOverride] = useState<string | null>(null);
  const [idsOverride, setIdsOverride] = useState<string[] | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if ((!isNew && isLoading) || exercisesLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-background dark:bg-backgroundDark">
        <ActivityIndicator />
      </View>
    );
  }

  if (!isNew && !preset) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-6 dark:bg-backgroundDark">
        <Text className="text-center text-gray">{t('common.entryNotFound')}</Text>
      </View>
    );
  }

  const title = titleOverride ?? preset?.title ?? '';
  const libraryIds = new Set(exercises.map((exercise) => exercise.id));
  const ids = (idsOverride ?? preset?.exercise_ids ?? []).filter((x) => libraryIds.has(x));
  const isDirty = titleOverride !== null || idsOverride !== null;
  const canSave = title.trim().length > 0 && ids.length > 0 && (isNew || isDirty);

  const toggle = (exerciseId: string) => {
    haptics.tick();
    setIdsOverride(ids.includes(exerciseId) ? ids.filter((x) => x !== exerciseId) : [...ids, exerciseId]);
  };

  const handleSave = async () => {
    setIsSaving(true);
    const input = { title: title.trim(), exercise_ids: ids };
    const { error } = isNew
      ? await createPreset.mutateAsync(input)
      : await updatePreset.mutateAsync({ ...input, id: preset!.id });
    setIsSaving(false);
    if (error) {
      toast.error(error);
      return;
    }
    toast.success(t('training.presetSaved'));
    router.back();
  };

  const handleDelete = async () => {
    if (!preset) return;
    const { error } = await deletePreset.mutateAsync(preset.id);
    setConfirmDelete(false);
    if (error) {
      toast.error(error);
      return;
    }
    toast.success(t('training.presetDeleted'));
    router.back();
  };

  const handleShown = async (shown: boolean) => {
    if (!preset) return;
    haptics.tick();
    const { error } = await setShown.mutateAsync({ id: preset.id, shown });
    if (error) toast.error(error);
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: t(isNew ? 'training.newPreset' : 'training.editPreset'),
          ...headerRightWithoutGlass(<HeaderSaveButton onPress={handleSave} enabled={canSave} isSaving={isSaving} />),
        }}
      />
      <ScrollView
        className="flex-1 bg-background dark:bg-backgroundDark"
        contentContainerClassName="gap-6 px-5 pb-12 pt-5"
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        automaticallyAdjustKeyboardInsets
      >
        <Input
          label={t('training.presetTitleLabel')}
          placeholder={t('training.presetTitlePlaceholder')}
          value={title}
          onChangeText={setTitleOverride}
          maxLength={40}
        />

        <View className="gap-2">
          <Text className="text-heading text-black dark:text-white">{t('training.presetExercisesLabel')}</Text>
          {exercises.length === 0 ? (
            <Text className="text-label text-gray">{t('training.presetNoExercises')}</Text>
          ) : (
            <View className="overflow-hidden rounded-2xl bg-surface dark:bg-surfaceDark">
              {exercises.map((exercise, index) => {
                const selected = ids.includes(exercise.id);
                return (
                  <View key={exercise.id}>
                    {index > 0 && <View className="ml-14 h-px bg-borderLight dark:bg-borderDark" />}
                    <Pressable
                      onPress={() => toggle(exercise.id)}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: selected }}
                      className="flex-row items-center gap-3 px-4 py-3"
                    >
                      <Ionicons
                        name={selected ? 'checkmark-circle' : 'ellipse-outline'}
                        size={26}
                        color={selected ? colors.accent : colors.gray}
                      />
                      <Text className="flex-1 text-body text-black dark:text-white">{exercise.name}</Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {preset && (
          <View className="flex-row items-center justify-between rounded-2xl bg-surface px-4 py-3 dark:bg-surfaceDark">
            <View className="flex-1 pr-3">
              <Text className="text-body text-black dark:text-white">{t('training.showWhenLogging')}</Text>
              <Text className="text-caption text-gray">{t('training.showWhenLoggingHint')}</Text>
            </View>
            <Switch
              value={preset.in_rotation}
              onValueChange={handleShown}
              trackColor={{ true: colors.accent }}
            />
          </View>
        )}

        {preset && (
          <Pressable onPress={() => setConfirmDelete(true)} className="items-center py-3">
            <Text className="text-body font-semibold text-red-600 dark:text-red-500">{t('training.deletePreset')}</Text>
          </Pressable>
        )}
      </ScrollView>

      <ConfirmModal
        visible={confirmDelete}
        variant="destructive"
        title={t('training.deletePresetTitle')}
        message={t('training.deletePresetMessage')}
        confirmLabel={t('common.delete')}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
        isLoading={deletePreset.isPending}
      />
    </>
  );
}
