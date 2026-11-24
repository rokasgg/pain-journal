import { differenceInCalendarDays, parseISO } from 'date-fns';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { ExperimentDots } from '@/components/insights/ExperimentDots';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { useDeleteExperiment, useExperimentResults, useStopExperiment } from '@/hooks/useExperiments';
import { formatDayLabel } from '@/lib/dates';
import { isRunning } from '@/lib/experimentResult';
import { experimentTitle, headlineKey, resultLines } from '@/lib/experimentText';
import { formatDayCount } from '@/lib/i18n/plural';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { toast } from '@/utils/toast';

// One experiment: its days, the full result (or what it still needs), and
// Stop / Delete.
export default function ExperimentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t, locale } = useTranslation();
  const { experiments, resultFor, statesFor, today, isLoading } = useExperimentResults();
  const stopExperiment = useStopExperiment();
  const deleteExperiment = useDeleteExperiment();
  // Which dialog, kept while it animates closed so its text doesn't flip.
  const [confirm, setConfirm] = useState<'stop' | 'delete'>('stop');
  const [confirmVisible, setConfirmVisible] = useState(false);
  const openConfirm = (action: 'stop' | 'delete') => {
    setConfirm(action);
    setConfirmVisible(true);
  };

  const experiment = experiments.find((e) => e.id === id);
  if (!experiment) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-6 dark:bg-backgroundDark">
        {!isLoading && <Text className="text-inkSecondary dark:text-gray">{t('common.entryNotFound')}</Text>}
      </View>
    );
  }

  const running = isRunning(experiment, today);
  const states = statesFor(experiment);
  const result = resultFor(experiment);
  const followed = states.filter((s) => s === 'followed').length;
  const day = Math.min(differenceInCalendarDays(parseISO(today), parseISO(experiment.started_on)) + 1, experiment.length_days);
  const status = running
    ? t('experiments.dayOf', { day, total: experiment.length_days })
    : experiment.status === 'stopped'
      ? t('experiments.stopped')
      : t('experiments.finished');
  const howTo = experiment.custom_title ? null : t(`experiments.templates.${experiment.template}.howTo`);

  const handleConfirm = async () => {
    const action = confirm;
    setConfirmVisible(false);
    if (action === 'stop') {
      const { error } = await stopExperiment.mutateAsync(experiment.id);
      if (error) toast.error(error);
    } else if (action === 'delete') {
      const { error } = await deleteExperiment.mutateAsync(experiment.id);
      if (error) toast.error(error);
      else router.back();
    }
  };

  return (
    <ScrollView className="flex-1 bg-background dark:bg-backgroundDark" contentContainerClassName="gap-5 px-6 py-6">
      <View className="gap-1">
        <Text className="text-[13px] font-semibold uppercase tracking-wide text-accent dark:text-primaryDark">{status}</Text>
        <Text className="text-[26px] font-bold text-ink dark:text-white">{experimentTitle(experiment, t)}</Text>
        <Text className="text-[15px] text-inkSecondary dark:text-gray">
          {t('experiments.started', { date: formatDayLabel(parseISO(experiment.started_on), locale, false) })}
        </Text>
        {howTo && <Text className="mt-1 text-[15px] leading-5 text-ink dark:text-white">{howTo}</Text>}
      </View>

      <View className="gap-3 rounded-[18px] bg-surface p-4 dark:bg-surfaceDark">
        <ExperimentDots states={states} showLegend />
        <Text className="text-[15px] text-ink dark:text-white">
          {t('experiments.stuckTo', { count: formatDayCount(followed, locale) })}
        </Text>
      </View>

      <View className="gap-2 rounded-[18px] bg-surface p-4 dark:bg-surfaceDark">
        {result.status === 'ready' ? (
          <>
            <Text className="text-[19px] font-bold text-ink dark:text-white">
              {running ? `${t('experiments.result.soFar')}: ` : ''}
              {t(headlineKey(result.pain))}
            </Text>
            {resultLines(result, t, locale).map((line) => (
              <Text key={line} className="text-[15px] leading-5 text-ink dark:text-white">
                {line}
              </Text>
            ))}
            <Text className="mt-1 text-[13px] text-inkSecondary dark:text-gray">{t('experiments.result.caveat')}</Text>
          </>
        ) : (
          <Text className="text-[15px] leading-5 text-inkSecondary dark:text-gray">
            {result.neededBaseline > 0
              ? t('experiments.result.needBaseline')
              : t('experiments.result.needFollowed', { count: result.neededFollowed })}
          </Text>
        )}
      </View>

      <View className="gap-3">
        {running && (
          <Pressable
            accessibilityRole="button"
            onPress={() => openConfirm('stop')}
            className="items-center rounded-xl border border-red-600 py-3 active:opacity-70 dark:border-red-500"
          >
            <Text className="text-[16px] font-semibold text-red-600 dark:text-red-500">{t('experiments.stop')}</Text>
          </Pressable>
        )}
        <Pressable accessibilityRole="button" onPress={() => openConfirm('delete')} className="items-center py-3 active:opacity-70">
          <Text className="text-[15px] text-red-600 dark:text-red-500">{t('experiments.delete')}</Text>
        </Pressable>
      </View>

      <ConfirmModal
        visible={confirmVisible}
        variant="destructive"
        title={t(confirm === 'stop' ? 'experiments.stopTitle' : 'experiments.deleteTitle')}
        message={t(confirm === 'stop' ? 'experiments.stopMessage' : 'experiments.deleteMessage')}
        confirmLabel={t(confirm === 'stop' ? 'experiments.stop' : 'experiments.delete')}
        onConfirm={handleConfirm}
        onCancel={() => setConfirmVisible(false)}
      />
    </ScrollView>
  );
}
