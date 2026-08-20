import * as Haptics from 'expo-haptics';
import { Link, useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { ActionSheet, type ActionSheetAction } from '@/components/ui/ActionSheet';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { MUSCLE_SIDE_OPTIONS, MUSCLE_STATUS_OPTIONS } from '@/constants/physio';
import { useDeletePhysioAssessment, usePhysioAssessments } from '@/hooks/usePhysioAssessments';
import { formatCheckinDate } from '@/lib/dates';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { toast } from '@/utils/toast';

export default function PhysioVisitsModal() {
  const { t } = useTranslation();
  const router = useRouter();
  const { assessments, isLoading } = usePhysioAssessments();
  const deletePhysioAssessment = useDeletePhysioAssessment();

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
    router.push(`/physio-visit/edit/${id}` as Href);
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

    const { error } = await deletePhysioAssessment.mutateAsync(id);

    if (error) {
      toast.error(error);
      return;
    }

    toast.success(t('physioVisits.deletedToast'));
  };

  const actions: ActionSheetAction[] = [
    { label: t('common.edit'), onPress: handleEdit },
    { label: t('common.delete'), onPress: handleRequestDelete, destructive: true },
  ];

  return (
    <ScrollView className="flex-1 bg-background dark:bg-backgroundDark" contentContainerClassName="gap-6 px-6 py-6">
      <Text className="text-sm text-gray-500 dark:text-gray">{t('physioVisits.description')}</Text>

      <Link href={'/physio-visit/new' as Href} asChild>
        <Pressable className="items-center rounded-lg bg-primary py-3 dark:bg-primaryDark">
          <Text className="font-semibold text-white">{t('physioVisits.logAVisit')}</Text>
        </Pressable>
      </Link>

      {isLoading ? (
        <ActivityIndicator />
      ) : assessments.length === 0 ? (
        <Text className="text-base text-gray-500 dark:text-gray">{t('physioVisits.noVisitsYet')}</Text>
      ) : (
        <View className="gap-3">
          {assessments.map((assessment) => (
            <Pressable
              key={assessment.id}
              onLongPress={() => handleLongPress(assessment.id)}
              className="gap-2 rounded-2xl bg-surface p-4 dark:bg-surfaceDark"
            >
              <View className="flex-row items-center justify-between">
                <Text className="text-base font-semibold text-black dark:text-white">
                  {formatCheckinDate(assessment.visit_date)}
                </Text>
                {assessment.physio_name && (
                  <Text className="text-sm text-gray-500 dark:text-gray">{assessment.physio_name}</Text>
                )}
              </View>

              {assessment.overall_notes && (
                <Text className="text-sm text-black dark:text-white">{assessment.overall_notes}</Text>
              )}

              <View className="flex-row flex-wrap gap-2">
                {(assessment.muscle_findings ?? []).map((finding) => {
                  const statusOption = MUSCLE_STATUS_OPTIONS.find((option) => option.value === finding.status);
                  const sideOption = MUSCLE_SIDE_OPTIONS.find((option) => option.value === finding.side);
                  return (
                    <View
                      key={finding.id}
                      className={`rounded-full px-3 py-1.5 ${statusOption?.activeClassName ?? 'bg-gray-500'}`}
                    >
                      <Text
                        className={`text-sm font-medium ${statusOption?.activeTextClassName ?? 'text-white'}`}
                      >
                        {finding.muscle_name}
                        {sideOption ? ` (${t(sideOption.labelKey)})` : ''}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </Pressable>
          ))}
        </View>
      )}

      <ActionSheet visible={actionSheetId !== null} actions={actions} onCancel={() => setActionSheetId(null)} />

      <ConfirmModal
        visible={confirmDeleteId !== null}
        title={t('physioVisits.deleteConfirmTitle')}
        message={t('physioVisits.deleteConfirmMessage')}
        confirmLabel={t('common.delete')}
        variant="destructive"
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </ScrollView>
  );
}
