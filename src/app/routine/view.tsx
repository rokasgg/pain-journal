import * as Haptics from 'expo-haptics';
import { Link, useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { ActionSheet, type ActionSheetAction } from '@/components/ui/ActionSheet';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { useDeleteRoutine, useRoutineHistory, useSetRoutineRotation } from '@/hooks/useRoutines';
import { formatCheckinDate } from '@/lib/dates';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { toast } from '@/utils/toast';

// All of the user's routines, newest first — old ones are never deleted
// (in_rotation just flips to false, see supabase_routines_migration_v2.sql).
// This is what TodaysRoutineCard's "View routine" button opens; tapping an
// entry goes to routine/[id].tsx for the full exercise list (and, for any
// routine currently in rotation, a "Start training" button — any number of
// routines can be in rotation at once, e.g. alternating physio-prescribed
// routines by day). Long-pressing a card opens an Edit/Rotation/Delete
// action sheet, same pattern as history/physio-visits.tsx.
export default function ViewRoutinesScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { routines, isLoading } = useRoutineHistory();
  const deleteRoutine = useDeleteRoutine();
  const setRoutineRotation = useSetRoutineRotation();

  const [actionSheetId, setActionSheetId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleLongPress = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setActionSheetId(id);
  };

  const handleEdit = () => {
    if (!actionSheetId) return;
    const id = actionSheetId;
    setActionSheetId(null);
    router.push(`/routine/edit/${id}` as Href);
  };

  const handleToggleRotation = async () => {
    if (!actionSheetId) return;
    const id = actionSheetId;
    const routine = routines.find((r) => r.id === id);
    setActionSheetId(null);
    if (!routine) return;

    const nextInRotation = !routine.in_rotation;
    const { error } = await setRoutineRotation.mutateAsync({ id, in_rotation: nextInRotation });

    if (error) {
      toast.error(error);
      return;
    }

    toast.success(nextInRotation ? t('routine.addedToRotationToast') : t('routine.removedFromRotationToast'));
  };

  const handleRequestDelete = () => {
    if (!actionSheetId) return;
    setConfirmDeleteId(actionSheetId);
    setActionSheetId(null);
  };

  const handleConfirmDelete = async () => {
    if (!confirmDeleteId) return;
    const id = confirmDeleteId;
    setConfirmDeleteId(null);

    const { error } = await deleteRoutine.mutateAsync(id);

    if (error) {
      toast.error(error);
      return;
    }

    toast.success(t('routine.deletedToast'));
  };

  const actionSheetRoutine = routines.find((r) => r.id === actionSheetId);
  const actions: ActionSheetAction[] = [
    { label: t('common.edit'), onPress: handleEdit },
    {
      label: actionSheetRoutine?.in_rotation ? t('routine.removeFromRotation') : t('routine.addToRotation'),
      onPress: handleToggleRotation,
    },
    { label: t('common.delete'), onPress: handleRequestDelete, destructive: true },
  ];

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-background dark:bg-backgroundDark">
        <ActivityIndicator />
      </View>
    );
  }

  if (routines.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-6 dark:bg-backgroundDark">
        <Text className="text-center text-gray-500 dark:text-gray">{t('routine.noRoutinesYet')}</Text>
      </View>
    );
  }

  return (
    <>
      <ScrollView className="flex-1 bg-background dark:bg-backgroundDark" contentContainerClassName="gap-3 px-6 py-6">
        {routines.map((routine) => (
          <Link key={routine.id} href={`/routine/${routine.id}` as Href} asChild>
            <Pressable
              onLongPress={() => handleLongPress(routine.id)}
              className="gap-2 rounded-xl border border-gray-200 bg-surface p-4 dark:border-gray-800 dark:bg-surfaceDark active:opacity-70"
            >
              <Text className="text-base font-semibold text-black dark:text-white">{routine.title}</Text>

              <View className="flex-row items-end justify-between">
                <Text className="text-xs text-gray-500 dark:text-gray">
                  {formatCheckinDate(routine.created_at.slice(0, 10))} ·{' '}
                  {t('routine.exerciseCount', { count: routine.exercises.length })}
                </Text>

                {routine.in_rotation && (
                  <View className="rounded-full bg-primaryMuted px-2 py-0.5 dark:bg-primaryMutedDark">
                    <Text className="text-xs font-semibold text-primary dark:text-primaryDark">
                      {t('routine.inRotationBadge')}
                    </Text>
                  </View>
                )}
              </View>
            </Pressable>
          </Link>
        ))}
      </ScrollView>

      <ActionSheet visible={actionSheetId !== null} actions={actions} onCancel={() => setActionSheetId(null)} />

      <ConfirmModal
        visible={confirmDeleteId !== null}
        title={t('routine.deleteConfirmTitle')}
        message={t('routine.deleteConfirmMessage')}
        confirmLabel={t('common.delete')}
        variant="destructive"
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </>
  );
}
