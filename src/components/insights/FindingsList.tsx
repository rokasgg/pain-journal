import { Ionicons } from '@expo/vector-icons';
import { Link, type Href } from 'expo-router';
import { Fragment, type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import { experimentHref } from '@/components/insights/ExperimentCard';
import { LockedCard } from '@/components/premium/LockedCard';
import { BOLD_MARK, TextWithBold } from '@/components/ui/TextWithBold';
import { useFindings } from '@/hooks/useFindings';
import { usePremium } from '@/hooks/usePremium';
import { formatOneDecimal } from '@/lib/dates';
import { experimentTitle } from '@/lib/experimentText';
import { factorKey, flarePatternSentence } from '@/lib/flareDetectiveText';
import type { Finding } from '@/lib/findings';
import { formatCount } from '@/lib/i18n/plural';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { colors } from '@/lib/theme';

const ICONS: Record<Finding['kind'], { name: keyof typeof Ionicons.glyphMap; color: string }> = {
  progress: { name: 'trending-up-outline', color: colors.accent },
  stress: { name: 'pulse-outline', color: '#7c3aed' },
  flare: { name: 'flash-outline', color: '#B4532A' },
  experiment: { name: 'flask-outline', color: colors.accent },
  trainingRelief: { name: 'barbell-outline', color: colors.accent },
  trainingNextDay: { name: 'barbell-outline', color: colors.accent },
  sleep: { name: 'bed-outline', color: '#4f46e5' },
  steps: { name: 'walk-outline', color: colors.accent },
  slots: { name: 'sunny-outline', color: '#d97706' },
};

export const FLARE_UPS_HREF = '/insights/flare-ups' as Href;

interface RowContent {
  text: string;
  bold: string;
  footnote: string;
  href?: Href;
}

function lowerFirst(text: string): string {
  return text.charAt(0).toLocaleLowerCase() + text.slice(1);
}

function useRowContent() {
  const { t, locale } = useTranslation();
  const last30 = t('insights.found.last30');
  const basedOn = (count: string, detail: string) => t('insights.basedOn', { count, detail });

  return (finding: Finding): RowContent => {
    switch (finding.kind) {
      case 'progress':
        return {
          // Never framed as failure: a higher trend is something to bring to a visit.
          text: t(finding.direction === 'better' ? 'insights.found.progressBetter' : 'insights.found.progressWorse', {
            start: formatOneDecimal(finding.start, locale),
            now: BOLD_MARK,
          }),
          bold: formatOneDecimal(finding.now, locale),
          footnote: basedOn(
            formatCount(finding.loggedDays, 'day', locale),
            t('insights.found.progressDetail', { count: finding.windowDays }),
          ),
        };
      case 'stress':
        return {
          text: t('insights.found.stress', { word: BOLD_MARK }),
          bold: t(finding.direction === 'higher' ? 'insights.found.higher' : 'insights.found.lower'),
          footnote: basedOn(
            formatCount(finding.entries, 'entry', locale),
            t('insights.found.stressValues', {
              stressful: formatOneDecimal(finding.stressful, locale),
              calm: formatOneDecimal(finding.calm, locale),
            }),
          ),
        };
      case 'flare':
        return {
          text: flarePatternSentence(t, locale, finding.pattern.hits, finding.pattern.total, BOLD_MARK),
          bold: t(`insights.flares.what.${factorKey(finding.pattern.factor, finding.pattern.direction)}`),
          footnote:
            finding.morePatterns > 0
              ? t('insights.found.flareMore', { count: finding.morePatterns + 1 })
              : basedOn(formatCount(finding.flares, 'flareUp', locale), t('insights.found.last90')),
          href: FLARE_UPS_HREF,
        };
      case 'experiment':
        return {
          text: t('insights.found.experiment', { title: experimentTitle(finding.experiment, t), result: BOLD_MARK }),
          bold: lowerFirst(t(`experiments.result.${finding.direction}`)),
          footnote: t('experiments.result.pain', {
            during: formatOneDecimal(finding.during, locale),
            before: formatOneDecimal(finding.before, locale),
          }),
          href: experimentHref(finding.experiment.id),
        };
      case 'trainingRelief':
        return {
          text: t('insights.found.trainingRelief', {
            value: formatOneDecimal(Math.abs(finding.avgDrop), locale),
            word: BOLD_MARK,
          }),
          bold: t(finding.avgDrop > 0 ? 'insights.found.lower' : 'insights.found.higher'),
          footnote: basedOn(formatCount(finding.sessions, 'session', locale), t('insights.found.painBeforeAfter')),
        };
      case 'trainingNextDay': {
        const { afterTraining, afterRest, trainingDays, restDays } = finding.comparison;
        return {
          text: t('insights.found.trainingNextDay', { word: BOLD_MARK }),
          bold: t(afterTraining < afterRest ? 'insights.found.lower' : 'insights.found.higher'),
          footnote: basedOn(
            formatCount(trainingDays + restDays, 'day', locale),
            t('training.nextDayValue', {
              training: formatOneDecimal(afterTraining, locale),
              rest: formatOneDecimal(afterRest, locale),
            }),
          ),
        };
      }
      case 'sleep':
        return {
          text: t('insights.sleepFinding', { word: BOLD_MARK }),
          bold: t(finding.direction === 'higher' ? 'insights.sleepHigher' : 'insights.sleepLower'),
          footnote: basedOn(formatCount(finding.entries, 'morning', locale), last30),
        };
      case 'steps':
        return {
          text: t('insights.activityFinding', {
            steps: new Intl.NumberFormat(locale === 'lt' ? 'lt-LT' : 'en-GB').format(finding.threshold),
            word: BOLD_MARK,
          }),
          bold: t(finding.direction === 'higher' ? 'insights.sleepHigher' : 'insights.sleepLower'),
          footnote: basedOn(formatCount(finding.entries, 'day', locale), t('insights.activityDetail')),
        };
      case 'slots':
        return {
          text: t(finding.direction === 'morningHigher' ? 'insights.morningHigher' : 'insights.eveningHigher', {
            diff: BOLD_MARK,
          }),
          bold: formatOneDecimal(Math.abs(finding.diff), locale),
          footnote: basedOn(formatCount(finding.entries, 'entry', locale), last30),
        };
    }
  };
}

function Card({ children }: { children: ReactNode }) {
  return <View className="rounded-[18px] bg-surface px-4 py-1 dark:bg-surfaceDark">{children}</View>;
}

function FindingRow({ finding }: { finding: Finding }) {
  const content = useRowContent()(finding);
  const icon = ICONS[finding.kind];
  const body = (
    <View className="flex-row gap-3 py-3.5">
      <Ionicons name={icon.name} size={20} color={icon.color} style={{ marginTop: 2 }} />
      <View className="flex-1 gap-1">
        <TextWithBold
          className="text-[16px] leading-[22px] text-ink dark:text-white"
          text={content.text}
          bold={content.bold}
        />
        <Text className="text-[13px] text-inkSecondary dark:text-gray">{content.footnote}</Text>
      </View>
      {content.href && <Ionicons name="chevron-forward" size={18} color={colors.gray} style={{ marginTop: 2 }} />}
    </View>
  );
  if (!content.href) return body;
  return (
    <Link href={content.href} asChild>
      <Pressable accessibilityRole="button" className="active:opacity-70">
        {body}
      </Pressable>
    </Link>
  );
}

// Insights → "What I've learned": only real findings, strongest kind first
// (src/lib/findings.ts). Sources still waiting for data are one line at the
// end, never a card each.
export function FindingsList() {
  const { t, locale } = useTranslation();
  const { findings, pending, isLoading } = useFindings();
  const { isPremium } = usePremium();
  if (isLoading) return null;

  if (findings.length === 0) {
    const empty = pending > 0;
    return (
      <View className="gap-1 rounded-[18px] bg-surface p-4 dark:bg-surfaceDark">
        <Text className="text-[17px] font-semibold text-ink dark:text-white">
          {t(empty ? 'insights.found.emptyTitle' : 'insights.found.nothingTitle')}
        </Text>
        <Text className="text-[15px] leading-5 text-inkSecondary dark:text-gray">
          {t(empty ? 'insights.found.emptyBody' : 'insights.found.nothingBody')}
        </Text>
      </View>
    );
  }

  // Free plan: the findings are computed on the phone (no cost), so the
  // teaser can say honestly how many are waiting.
  if (!isPremium) {
    return (
      <LockedCard
        feature="findings"
        title={
          findings.length === 1
            ? t('premium.features.findingsReadyOne')
            : t('premium.features.findingsReady', { count: findings.length })
        }
        hideFooter
      />
    );
  }

  return (
    <Card>
      {findings.map((finding, index) => (
        <Fragment key={`${finding.kind}-${index}`}>
          {index > 0 && <View className="ml-8 h-px bg-borderLight dark:bg-borderDark" />}
          <FindingRow finding={finding} />
        </Fragment>
      ))}
      {pending > 0 && (
        <>
          <View className="h-px bg-borderLight dark:bg-borderDark" />
          <Text className="py-3 text-[13px] text-inkSecondary dark:text-gray">
            {t('insights.found.pending', { count: formatCount(pending, 'finding', locale) })}
          </Text>
        </>
      )}
    </Card>
  );
}
