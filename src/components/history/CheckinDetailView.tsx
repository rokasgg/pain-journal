import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Dimensions, Modal, Pressable, Text, View } from 'react-native';

import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { PAIN_AREA_LABEL_KEYS, TRIGGER_LABEL_KEYS } from '@/constants/symptoms';
import { EXERCISE_TYPE_LABEL_KEYS } from '@/lib/checkinChoices';
import { useDeleteCheckin } from '@/hooks/useCheckins';
import { formatCheckinDate } from '@/lib/dates';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { colors } from '@/lib/theme';
import type { Checkin } from '@/types/database.types';
import { toast } from '@/utils/toast';

function DetailRow({ label, value }: { label: string; value: string | number | null | undefined }) {
  if (value === null || value === undefined || value === '') return null;

  return (
    <View className="flex-row items-center justify-between py-2">
      <Text className="text-sm text-gray dark:text-gray">{label}</Text>
      <Text className="text-base text-black dark:text-white">{value}</Text>
    </View>
  );
}

function ScaleRow({ label, value }: { label: string; value: number | null | undefined }) {
  if (value === null || value === undefined) return null;

  return (
    <View className="flex-row items-center justify-between py-2">
      <Text className="text-sm text-gray dark:text-gray">{label}</Text>
      <Text className="text-base text-black dark:text-white">
        {value}
        <Text className="text-base text-gray dark:text-gray">/10</Text>
      </Text>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="gap-1 rounded-2xl bg-surface px-4 py-2 dark:bg-surfaceDark">
      <Text className="pt-2 text-xs font-semibold uppercase text-primary dark:text-gray">{title}</Text>
      {children}
    </View>
  );
}

export interface CheckinDetailViewProps {
  checkin: Checkin;
  showDate?: boolean;
  /** Called after a successful delete — e.g. to navigate back off a now-gone detail screen. */
  onDeleted?: () => void;
}

export function CheckinDetailView({ checkin, showDate = true, onDeleted }: CheckinDetailViewProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const deleteCheckin = useDeleteCheckin();
  const menuButtonRef = useRef<View>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; right: number } | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isConfirmDeleteVisible, setIsConfirmDeleteVisible] = useState(false);

  const openMenu = () => {
    menuButtonRef.current?.measureInWindow((x, y, width, height) => {
      setMenuPosition({ top: y + height + 4, right: Dimensions.get('window').width - (x + width) });
      setIsMenuOpen(true);
    });
  };

  const handleConfirmDelete = async () => {
    setIsConfirmDeleteVisible(false);
    const { error } = await deleteCheckin.mutateAsync(checkin.id);

    if (error) {
      toast.error(error);
      return;
    }

    toast.success(t('checkin.checkinDeletedToast'));
    onDeleted?.();
  };

  const symptomLabels = [
    checkin.symptoms.tingling && t('symptoms.tingling'),
    checkin.symptoms.numbness && t('symptoms.numbness'),
    checkin.symptoms.weakness && t('symptoms.weakness'),
    checkin.symptoms.headache && t('symptoms.headache'),
    checkin.symptoms.dizziness && t('symptoms.dizziness'),
    ...(checkin.symptoms.custom ?? []),
  ].filter(Boolean) as string[];

  const painAreaLabels = (checkin.symptoms.pain_areas ?? []).map(
    (area) => t(PAIN_AREA_LABEL_KEYS[area] ?? area),
  );

  return (
    <View className="gap-4">
      <View className="flex-row items-center justify-between">
        <Text className="text-xl font-bold text-strongGray dark:text-white">
          {t(checkin.type === 'morning' ? 'detail.morningCheckin' : 'detail.eveningCheckin')}
        </Text>

        <View className="flex-row items-center gap-3">
          {showDate && (
            <Text className="text-sm text-strongGray dark:text-white">
              {formatCheckinDate(checkin.checkin_date)}
            </Text>
          )}
          <Pressable ref={menuButtonRef} onPress={openMenu} hitSlop={8} accessibilityRole="button">
            <Ionicons name="ellipsis-horizontal" size={20} color={colors.gray} />
          </Pressable>
        </View>
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
              className="absolute w-40 gap-0.5 rounded-xl border border-gray bg-white p-1 shadow-lg dark:border-gray-800 dark:bg-surfaceDark"
              style={{ top: menuPosition.top, right: menuPosition.right }}
            >
              <Pressable
                onPress={() => {
                  setIsMenuOpen(false);
                  router.push({ pathname: '/checkin/edit/[id]', params: { id: checkin.id } });
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
        title={t('checkin.deleteConfirmTitle')}
        message={t('checkin.deleteConfirmMessage')}
        confirmLabel={t('common.delete')}
        variant="destructive"
        onConfirm={handleConfirmDelete}
        onCancel={() => setIsConfirmDeleteVisible(false)}
      />

      <Section title={t('detail.painAndMovementSection')}>
        <ScaleRow label={t('detail.painLevel')} value={checkin.pain_level} />
        <ScaleRow label={t('detail.stiffness')} value={checkin.stiffness_level} />
        <ScaleRow label={t('detail.rangeOfMotion')} value={checkin.range_of_motion} />
      </Section>

      {checkin.type === 'morning' && (
        <Section title={t('detail.sleepSection')}>
          <ScaleRow label={t('detail.sleepQuality')} value={checkin.sleep_quality} />
          <DetailRow label={t('detail.sleepHours')} value={checkin.sleep_hours} />
          <DetailRow
            label={t('detail.wokeUpWithPain')}
            value={checkin.woke_up_with_pain ? t('common.yes') : t('common.no')}
          />
          <DetailRow
            label={t('detail.sleepPosition')}
            value={checkin.sleep_position ? t(`sleepPosition.${checkin.sleep_position}`) : null}
          />
        </Section>
      )}

      {checkin.type === 'evening' && (
        <>
          <Section title={t('detail.lifestyleSection')}>
            <ScaleRow label={t('detail.activityLevel')} value={checkin.activity_level} />
            <DetailRow label={t('detail.screenTimeHours')} value={checkin.screen_time_hours} />
          </Section>

          <Section title={t('detail.exercisesSection')}>
            <View className="flex-row items-center justify-between py-2">
              <Text className="text-sm text-gray dark:text-gray">{t('detail.didExercises')}</Text>
              <Text
                className={
                  checkin.did_exercises
                    ? 'text-base font-semibold text-green-600 dark:text-green-400'
                    : 'text-base text-black dark:text-white'
                }
              >
                {checkin.did_exercises ? t('common.yes') : t('common.no')}
              </Text>
            </View>
            {(checkin.exercise_types ?? []).length > 0 && (
              <View className="flex-row items-start justify-between gap-4 py-2">
                <Text className="text-sm text-gray dark:text-gray">{t('detail.exerciseTypes')}</Text>
                <Text className="flex-1 text-right text-base text-black dark:text-white">
                  {(checkin.exercise_types ?? []).map((v) => t(EXERCISE_TYPE_LABEL_KEYS[v] ?? v)).join(', ')}
                </Text>
              </View>
            )}
            <DetailRow label={t('detail.exerciseHours')} value={checkin.exercise_hours} />
            <ScaleRow label={t('detail.exerciseIntensity')} value={checkin.exercise_intensity} />
          </Section>
        </>
      )}

      {symptomLabels.length > 0 && (
        <View className="gap-1 ml-4">
          <Text className="text-sm font-semibold uppercase text-gray dark:text-gray">
            {t('detail.symptoms')}
          </Text>
          <Text className="text-base text-strongGray dark:text-white">{symptomLabels.join(', ')}</Text>
          {checkin.symptoms.radiating_to && (
            <Text className="text-sm text-gray dark:text-gray">
              {t('detail.radiatingTo', { location: checkin.symptoms.radiating_to })}
            </Text>
          )}
        </View>
      )}

      {painAreaLabels.length > 0 && (
        <View className="gap-1 ml-4">
          <Text className="text-sm font-semibold uppercase text-gray dark:text-gray">
            {t('detail.painAreas')}
          </Text>
          <Text className="text-base text-strongGray dark:text-white">{painAreaLabels.join(', ')}</Text>
        </View>
      )}

      {checkin.triggers.length > 0 && (
        <View className="gap-1 ml-4">
          <Text className="text-sm font-semibold uppercase text-gray dark:text-gray">
            {t('detail.triggers')}
          </Text>
          <View className="flex-row flex-wrap gap-2 ">
            {checkin.triggers.map((trigger) => (
              <View key={trigger} className="rounded-full bg-amber-100 px-3 py-1 dark:bg-amber-900/30">
                <Text className="text-sm font-medium text-amber-800 dark:text-amber-300">
                  {t(TRIGGER_LABEL_KEYS[trigger] ?? trigger)}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {checkin.exercise_notes && (
        <View className="gap-1 ml-4">
          <Text className="text-sm font-semibold uppercase text-gray dark:text-gray">
            {t('detail.exerciseNotes')}
          </Text>
          <Text className="text-base text-strongGray dark:text-white">{checkin.exercise_notes}</Text>
        </View>
      )}

      {checkin.notes && (
        <View className="gap-1 ml-4">
          <Text className="text-sm font-semibold uppercase text-gray dark:text-gray">{t('detail.notes')}</Text>
          <Text className="text-base text-strongGray dark:text-white">{checkin.notes}</Text>
        </View>
      )}
    </View>
  );
}
