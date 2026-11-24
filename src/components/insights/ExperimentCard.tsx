import { Ionicons } from '@expo/vector-icons';
import { differenceInCalendarDays, parseISO } from 'date-fns';
import { Link, type Href } from 'expo-router';
import { Fragment, type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import { ExperimentDots } from '@/components/insights/ExperimentDots';
import { CUSTOM_EXPERIMENT, EXPERIMENT_TEMPLATES } from '@/constants/experiments';
import { useExperimentResults } from '@/hooks/useExperiments';
import type { ExperimentResult } from '@/lib/experimentResult';
import { isRunning } from '@/lib/experimentResult';
import { experimentTitle, headlineKey, resultLines } from '@/lib/experimentText';
import { formatDayCount } from '@/lib/i18n/plural';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { colors } from '@/lib/theme';
import type { Experiment } from '@/types/database.types';

export function experimentHref(id: string): Href {
  return { pathname: '/insights/experiment/[id]', params: { id } } as Href;
}

export function newExperimentHref(template?: string): Href {
  return (template ? { pathname: '/insights/experiment/new', params: { template } } : '/insights/experiment/new') as Href;
}

function Card({ children }: { children: ReactNode }) {
  return <View className="gap-3 rounded-[18px] bg-surface p-4 dark:bg-surfaceDark">{children}</View>;
}

function Row({ href, icon, title, subtitle }: { href: Href; icon: keyof typeof Ionicons.glyphMap; title: string; subtitle?: string }) {
  return (
    <Link href={href} asChild>
      <Pressable accessibilityRole="button" className="flex-row items-center gap-3 py-2.5 active:opacity-70">
        <View className="h-9 w-9 items-center justify-center rounded-xl bg-accentMuted dark:bg-primaryMutedDark">
          <Ionicons name={icon} size={18} color={colors.accent} />
        </View>
        <View className="flex-1">
          <Text className="text-[16px] font-medium text-ink dark:text-white">{title}</Text>
          {subtitle ? <Text className="text-[13px] text-inkSecondary dark:text-gray">{subtitle}</Text> : null}
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.gray} />
      </Pressable>
    </Link>
  );
}

// The result in one or two lines, or what it still needs.
export function ResultSummary({ result, running }: { result: ExperimentResult; running: boolean }) {
  const { t, locale } = useTranslation();
  if (result.status !== 'ready') {
    return (
      <Text className="text-[15px] text-inkSecondary dark:text-gray">
        {result.neededBaseline > 0
          ? t('experiments.result.needBaseline')
          : t('experiments.result.needFollowed', { count: result.neededFollowed })}
      </Text>
    );
  }
  return (
    <View className="gap-1">
      <Text className="text-[17px] font-semibold text-ink dark:text-white">
        {running ? `${t('experiments.result.soFar')}: ` : ''}
        {t(headlineKey(result.pain))}
      </Text>
      <Text className="text-[15px] leading-5 text-ink dark:text-white">{resultLines(result, t, locale)[0]}</Text>
    </View>
  );
}

function CurrentExperiment({ experiment }: { experiment: Experiment }) {
  const { t, locale } = useTranslation();
  const { resultFor, statesFor, today } = useExperimentResults();
  const running = isRunning(experiment, today);
  const states = statesFor(experiment);
  const followed = states.filter((s) => s === 'followed').length;
  const day = Math.min(differenceInCalendarDays(parseISO(today), parseISO(experiment.started_on)) + 1, experiment.length_days);

  return (
    <Card>
      <Link href={experimentHref(experiment.id)} asChild>
        <Pressable accessibilityRole="button" className="gap-3 active:opacity-80">
          <View className="flex-row items-start gap-3">
            <View className="flex-1 gap-0.5">
              <Text className="text-[13px] font-semibold uppercase tracking-wide text-accent dark:text-primaryDark">
                {running ? t('experiments.dayOf', { day, total: experiment.length_days }) : t('experiments.finished')}
              </Text>
              <Text className="text-[17px] font-semibold text-ink dark:text-white">{experimentTitle(experiment, t)}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.gray} />
          </View>
          <ExperimentDots states={states} />
          <Text className="text-[13px] text-inkSecondary dark:text-gray">
            {t('experiments.stuckTo', { count: formatDayCount(followed, locale) })}
          </Text>
          <ResultSummary result={resultFor(experiment)} running={running} />
        </Pressable>
      </Link>
      {!running && (
        <Link href={newExperimentHref()} asChild>
          <Pressable
            accessibilityRole="button"
            className="items-center rounded-xl bg-primary py-3 active:opacity-90 dark:bg-primaryDark"
          >
            <Text className="text-[16px] font-semibold text-white">{t('experiments.startAnother')}</Text>
          </Pressable>
        </Link>
      )}
    </Card>
  );
}

function Ideas() {
  const { t } = useTranslation();
  return (
    <Card>
      <Text className="text-[13px] font-semibold uppercase tracking-wide text-inkSecondary dark:text-gray">
        {t('experiments.ideasTitle')}
      </Text>
      <View>
        {EXPERIMENT_TEMPLATES.map((tpl) => (
          <Row
            key={tpl.id}
            href={newExperimentHref(tpl.id)}
            icon={tpl.icon}
            title={t(`experiments.templates.${tpl.id}.title`)}
            subtitle={t(`experiments.templates.${tpl.id}.howTo`)}
          />
        ))}
        <Row href={newExperimentHref(CUSTOM_EXPERIMENT)} icon="create-outline" title={t('experiments.custom')} />
      </View>
    </Card>
  );
}

// insights/experiments: how it works, the current experiment (day N of M,
// the dot bar, the result so far), every idea to try, and past experiments.
export function ExperimentsOverview() {
  const { t } = useTranslation();
  const { current, past, resultFor, isLoading } = useExperimentResults();
  if (isLoading) return null;

  const pastToShow = past.filter((e) => e.id !== current?.id);

  return (
    <View className="gap-4">
      <Text className="px-1 text-[15px] leading-5 text-inkSecondary dark:text-gray">{t('experiments.introBody')}</Text>
      {current && <CurrentExperiment experiment={current} />}
      <Ideas />
      {pastToShow.length > 0 && (
        <Card>
          <Text className="text-[13px] font-semibold uppercase tracking-wide text-inkSecondary dark:text-gray">
            {t('experiments.past')}
          </Text>
          <View>
            {pastToShow.map((experiment, index) => {
              const result = resultFor(experiment);
              return (
                <Fragment key={experiment.id}>
                  {index > 0 && <View className="h-px bg-borderLight dark:bg-borderDark" />}
                  <Row
                    href={experimentHref(experiment.id)}
                    icon="flask-outline"
                    title={experimentTitle(experiment, t)}
                    subtitle={
                      experiment.status === 'stopped'
                        ? t('experiments.stopped')
                        : result.status === 'ready'
                          ? t(headlineKey(result.pain))
                          : t('experiments.finished')
                    }
                  />
                </Fragment>
              );
            })}
          </View>
        </Card>
      )}
    </View>
  );
}
