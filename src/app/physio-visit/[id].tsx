import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useRef, useState } from 'react';
import { Dimensions, Modal, Pressable, ScrollView, Text, View } from 'react-native';

import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { MUSCLE_SIDE_OPTIONS, MUSCLE_STATUS_OPTIONS } from '@/constants/physio';
import { useDeletePhysioAssessment, usePhysioAssessments } from '@/hooks/usePhysioAssessments';
import { formatCheckinDate } from '@/lib/dates';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { colors } from '@/lib/theme';
import { toast } from '@/utils/toast';

export default function PhysioVisitDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const router = useRouter();
  const { assessments } = usePhysioAssessments();
  const deletePhysioAssessment = useDeletePhysioAssessment();

  const menuButtonRef = useRef<View>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; right: number } | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isConfirmDeleteVisible, setIsConfirmDeleteVisible] = useState(false);

  const assessment = assessments.find((a) => a.id === id);

  const openMenu = () => {
    menuButtonRef.current?.measureInWindow((x, y, width, height) => {
      setMenuPosition({ top: y + height + 4, right: Dimensions.get('window').width - (x + width) });
      setIsMenuOpen(true);
    });
  };

  const handleConfirmDelete = async () => {
    setIsConfirmDeleteVisible(false);
    if (!assessment) return;

    const { error } = await deletePhysioAssessment.mutateAsync(assessment.id);

    if (error) {
      toast.error(error);
      return;
    }

    toast.success(t('physioVisits.deletedToast'));
    router.back();
  };

  if (!assessment) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-6 dark:bg-backgroundDark">
        <Text className="text-gray-500 dark:text-gray">{t('common.entryNotFound')}</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-background dark:bg-backgroundDark" contentContainerClassName="gap-4 px-6 py-6">
      <View className="flex-row items-center justify-between">
        <Text className="text-xl font-bold text-black dark:text-white">
          {formatCheckinDate(assessment.visit_date)}
        </Text>
        <Pressable ref={menuButtonRef} onPress={openMenu} hitSlop={8} accessibilityRole="button">
          <Ionicons name="ellipsis-horizontal" size={20} color={colors.gray} />
        </Pressable>
      </View>

      {assessment.physio_name && (
        <Text className="text-sm text-gray-500 dark:text-gray">{assessment.physio_name}</Text>
      )}

      {assessment.next_visit_date && (
        <Text className="text-sm text-gray-500 dark:text-gray">
          {t('insights.nextVisitLabel', { date: formatCheckinDate(assessment.next_visit_date) })}
        </Text>
      )}

      {assessment.overall_notes && (
        <Text className="text-base text-black dark:text-white">{assessment.overall_notes}</Text>
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
              <Text className={`text-sm font-medium ${statusOption?.activeTextClassName ?? 'text-white'}`}>
                {finding.muscle_name}
                {sideOption ? ` (${t(sideOption.labelKey)})` : ''}
              </Text>
            </View>
          );
        })}
      </View>

      <Modal
        visible={isMenuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsMenuOpen(false)}
      >
        <Pressable className="flex-1" onPress={() => setIsMenuOpen(false)}>
          {menuPosition && (
            <View
              className="absolute w-40 gap-0.5 rounded-xl border border-gray-200 bg-white p-1 shadow-lg dark:border-gray-800 dark:bg-surfaceDark"
              style={{ top: menuPosition.top, right: menuPosition.right }}
            >
              <Pressable
                onPress={() => {
                  setIsMenuOpen(false);
                  router.push(`/physio-visit/edit/${assessment.id}` as Href);
                }}
                className="rounded-lg px-3 py-2.5"
              >
                <Text className="text-sm font-medium text-black dark:text-white">{t('common.edit')}</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setIsMenuOpen(false);
                  setIsConfirmDeleteVisible(true);
                }}
                className="rounded-lg px-3 py-2.5"
              >
                <Text className="text-sm font-medium text-red-600 dark:text-red-500">{t('common.delete')}</Text>
              </Pressable>
            </View>
          )}
        </Pressable>
      </Modal>

      <ConfirmModal
        visible={isConfirmDeleteVisible}
        title={t('physioVisits.deleteConfirmTitle')}
        message={t('physioVisits.deleteConfirmMessage')}
        confirmLabel={t('common.delete')}
        variant="destructive"
        onConfirm={handleConfirmDelete}
        onCancel={() => setIsConfirmDeleteVisible(false)}
      />
    </ScrollView>
  );
}
