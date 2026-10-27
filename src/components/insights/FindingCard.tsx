import { Ionicons } from '@expo/vector-icons';
import { parseISO } from 'date-fns';
import { useMemo, type ReactNode } from 'react';
import { Text, View } from 'react-native';

import { BOLD_MARK, TextWithBold } from '@/components/ui/TextWithBold';
import { useCheckinHistory } from '@/hooks/useCheckins';
import { formatDateRange, formatOneDecimal, todayLocalDate } from '@/lib/dates';
import { formatCount } from '@/lib/i18n/plural';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { findingsWindow, morningVsEvening, sleepVsMorningPain } from '@/lib/insightFindings';

// Same amber sun / indigo moon as Home's check-in card.
const MORNING_COLOR = '#d97706';
const EVENING_COLOR = '#4f46e5';
const SCALE_MAX = 10;

function Card({ children }: { children: ReactNode }) {
  return <View className="gap-3 rounded-[18px] bg-surface p-4 dark:bg-surfaceDark">{children}</View>;
}

function Footnote({ children }: { children: string }) {
  return <Text className="text-[13px] text-inkSecondary dark:text-gray">{children}</Text>;
}

function SlotBar({
  icon,
  color,
  label,
  value,
  locale,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  label: string;
  value: number;
  locale: 'en' | 'lt';
}) {
  return (
    <View className="flex-row items-center gap-2">
      <Ionicons name={icon} size={16} color={color} />
      <Text className="w-20 text-[15px] text-ink dark:text-white">{label}</Text>
      <View className="h-2 flex-1 overflow-hidden rounded-full bg-segmentTrack dark:bg-segmentTrackDark">
        <View
          className="h-full rounded-full"
          style={{ width: `${Math.min(value / SCALE_MAX, 1) * 100}%`, backgroundColor: color }}
        />
      </View>
      <Text className="w-9 text-right text-[15px] font-bold text-ink dark:text-white">
        {formatOneDecimal(value, locale)}
      </Text>
    </View>
  );
}

// Insights → "This week's insights": morning vs evening pain, and sleep vs
// morning pain, over the last 7 days (src/lib/insightFindings.ts). Each card
// says what it's based on; with too little data it says so instead.
export function WeekFindings() {
  const { t, locale } = useTranslation();
  const { checkins } = useCheckinHistory(30);
  const today = todayLocalDate();

  const { slots, sleep, range } = useMemo(() => {
    const window = findingsWindow(today);
    return {
      slots: morningVsEvening(checkins, today),
      sleep: sleepVsMorningPain(checkins, today),
      range: formatDateRange(parseISO(window.from), parseISO(window.to), locale),
    };
  }, [checkins, today, locale]);

  const notEnough = (needed: number) =>
    t('insights.findingNotEnough', { count: formatCount(needed, 'entryGen', locale) });

  return (
    <View className="gap-3">
      <Card>
        {slots.status === 'ready' ? (
          <>
            {slots.direction === 'similar' ? (
              <Text className="text-[17px] font-semibold leading-6 text-ink dark:text-white">
                {t('insights.slotsSimilar')}
              </Text>
            ) : (
              <TextWithBold
                className="text-[17px] font-semibold leading-6 text-ink dark:text-white"
                text={t(slots.direction === 'morningHigher' ? 'insights.morningHigher' : 'insights.eveningHigher', {
                  diff: BOLD_MARK,
                })}
                bold={formatOneDecimal(Math.abs(slots.diff), locale)}
              />
            )}
            <View className="gap-2">
              <SlotBar icon="sunny-outline" color={MORNING_COLOR} label={t('home.morning')} value={slots.morning} locale={locale} />
              <SlotBar icon="moon-outline" color={EVENING_COLOR} label={t('home.evening')} value={slots.evening} locale={locale} />
            </View>
            <Footnote>
              {t('insights.basedOn', { count: formatCount(slots.entries, 'entry', locale), detail: range })}
            </Footnote>
          </>
        ) : (
          <>
            <Text className="text-[17px] font-semibold text-ink dark:text-white">{t('insights.slotsTitle')}</Text>
            <Footnote>{notEnough(slots.needed)}</Footnote>
          </>
        )}
      </Card>

      <Card>
        <View className="flex-row gap-3">
          <View className="h-11 w-11 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-950">
            <Ionicons name="bed-outline" size={22} color={EVENING_COLOR} />
          </View>
          <View className="flex-1 gap-1">
            {sleep.status === 'ready' ? (
              <TextWithBold
                className="text-[17px] font-semibold leading-6 text-ink dark:text-white"
                text={t('insights.sleepFinding', { word: BOLD_MARK })}
                bold={t(
                  sleep.direction === 'higher'
                    ? 'insights.sleepHigher'
                    : sleep.direction === 'lower'
                      ? 'insights.sleepLower'
                      : 'insights.sleepSimilar',
                )}
              />
            ) : (
              <Text className="text-[17px] font-semibold text-ink dark:text-white">{t('insights.sleepTitle')}</Text>
            )}
            <Footnote>
              {sleep.status === 'ready'
                ? t('insights.basedOn', {
                  count: formatCount(sleep.entries, 'morning', locale),
                  detail: t('insights.sleepDetail'),
                })
                : sleep.status === 'oneSided'
                  ? t('insights.sleepOneSided')
                  : notEnough(sleep.needed)}
            </Footnote>
          </View>
        </View>
      </Card>
    </View>
  );
}
