import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { Fragment, type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import { newExperimentHref } from '@/components/insights/ExperimentCard';

import { BOLD_MARK, TextWithBold } from '@/components/ui/TextWithBold';
import { templateForPattern } from '@/constants/experiments';
import { TRIGGER_LABEL_KEYS } from '@/constants/symptoms';
import { useExperiments } from '@/hooks/useExperiments';
import { useFlareDetective } from '@/hooks/useFlareDetective';
import { factorKey, formatFactorValue, formatFlareDuration } from '@/lib/flareDetectiveText';
import { formatCount } from '@/lib/i18n/plural';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { colors } from '@/lib/theme';

const FLARE_COLOR = '#B4532A';

function Card({ children }: { children: ReactNode }) {
  return <View className="gap-3 rounded-[18px] bg-surface p-4 dark:bg-surfaceDark">{children}</View>;
}

function Header({ title, body }: { title: string; body: string }) {
  return (
    <View className="flex-row gap-3">
      <View className="h-11 w-11 items-center justify-center rounded-xl bg-orange-100 dark:bg-orange-950">
        <Ionicons name="flash-outline" size={22} color={FLARE_COLOR} />
      </View>
      <View className="flex-1 gap-1">
        <Text className="text-[17px] font-semibold leading-6 text-ink dark:text-white">{title}</Text>
        <Text className="text-[15px] leading-5 text-inkSecondary dark:text-gray">{body}</Text>
      </View>
    </View>
  );
}

function FactLine({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View className="flex-row items-center gap-2">
      <Ionicons name={icon} size={16} color={FLARE_COLOR} />
      <Text className="flex-1 text-[15px] text-ink dark:text-white">{text}</Text>
    </View>
  );
}

// Insights → "Flare-ups": what tends to come before the user's flare-ups,
// measured against their own usual days (src/lib/flareDetective.ts). With too
// few flare-ups it says how many more it needs instead of guessing. The
// wording only says what came before, never what caused it.
export function FlarePatternsCard() {
  const { t, locale } = useTranslation();
  const { result, isLoading } = useFlareDetective();
  const { running } = useExperiments();

  if (isLoading) return null;

  if (result.status === 'none') {
    return (
      <Card>
        <Header title={t('insights.flares.noneTitle')} body={t('insights.flares.noneBody')} />
      </Card>
    );
  }

  if (result.status === 'notEnough') {
    return (
      <Card>
        <Header
          title={t('insights.flares.notEnoughTitle')}
          body={t('insights.flares.notEnoughBody', { count: formatCount(result.needed, 'flareUpGen', locale) })}
        />
      </Card>
    );
  }

  // Suggest the experiment that fits the strongest pattern, unless one is
  // already running.
  const suggested = running
    ? undefined
    : result.patterns.map((p) => templateForPattern(p.factor, p.direction)).find((tpl) => tpl !== undefined);

  const triggerList = result.triggers
    .map(({ trigger, count }) => `${TRIGGER_LABEL_KEYS[trigger] ? t(TRIGGER_LABEL_KEYS[trigger]) : trigger} (${count})`)
    .join(', ');

  return (
    <Card>
      {result.patterns.length === 0 ? (
        <Header title={t('insights.flares.nothingTitle')} body={t('insights.flares.nothingBody')} />
      ) : (
        result.patterns.map((pattern, index) => (
          <Fragment key={factorKey(pattern.factor, pattern.direction)}>
            {index > 0 && <View className="h-px bg-borderLight dark:bg-borderDark" />}
            <View className="gap-1">
              <TextWithBold
                className="text-[17px] font-semibold leading-6 text-ink dark:text-white"
                text={t('insights.flares.patternSentence', {
                  hits: pattern.hits,
                  total: formatCount(pattern.total, 'flareUpOf', locale),
                  what: BOLD_MARK,
                })}
                bold={t(`insights.flares.what.${factorKey(pattern.factor, pattern.direction)}`)}
              />
              {pattern.factor !== 'trained' && (
                <Text className="text-[15px] text-inkSecondary dark:text-gray">
                  {t('insights.flares.usual', { value: formatFactorValue(pattern.factor, pattern.usual, t, locale) })}
                </Text>
              )}
            </View>
          </Fragment>
        ))
      )}

      {suggested && (
        <Link href={newExperimentHref(suggested.id)} asChild>
          <Pressable accessibilityRole="button" className="flex-row items-center gap-2 self-start py-1 active:opacity-70">
            <Ionicons name="flask-outline" size={18} color={colors.accent} />
            <Text className="text-[15px] font-semibold text-accent dark:text-primaryDark">
              {t('insights.flares.tryExperiment')}: {t(`experiments.templates.${suggested.id}.title`)}
            </Text>
          </Pressable>
        </Link>
      )}

      {(triggerList || result.timeOfDay || result.avgDurationMinutes !== null) && (
        <View className="gap-2 rounded-xl bg-background p-3 dark:bg-backgroundDark">
          {triggerList ? <FactLine icon="pricetag-outline" text={t('insights.flares.triggers', { list: triggerList })} /> : null}
          {result.timeOfDay && (
            <FactLine
              icon="time-outline"
              text={t('insights.flares.timeOfDay', { when: t(`insights.flares.when.${result.timeOfDay}`) })}
            />
          )}
          {result.avgDurationMinutes !== null && (
            <FactLine
              icon="hourglass-outline"
              text={t('insights.flares.duration', { duration: formatFlareDuration(result.avgDurationMinutes, t) })}
            />
          )}
        </View>
      )}

      <Text className="text-[13px] text-inkSecondary dark:text-gray">
        {t('insights.flares.basedOn', { count: formatCount(result.flares, 'flareUp', locale) })}
      </Text>
    </Card>
  );
}
