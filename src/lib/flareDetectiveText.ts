import { SCREEN_TIME_BUCKETS, screenTimeBucketId } from '@/lib/checkinChoices';
import { formatOneDecimal } from '@/lib/dates';
import type { Deviation, Direction, FactorId } from '@/lib/flareDetective';
import { formatDuration } from '@/lib/sleep';
import type { Locale } from '@/store/useLocaleStore';

// Wording for the flare-up detective, shared by the Insights card, the
// flare-up detail screen and the visit PDF, so all three say the same thing.

type Translate = (key: string, vars?: Record<string, string | number>) => string;

export function factorKey(factor: FactorId, direction: Direction): string {
  return `${factor}_${direction}`;
}

// A factor's value in the user's terms: "5 h 30 min", "7/10", "4–6 h",
// "6 200 steps". Usual values are medians, so they're rounded to what a
// person would say.
export function formatFactorValue(factor: FactorId, value: number, t: Translate, locale: Locale): string {
  switch (factor) {
    case 'sleepHours':
      // Round to the half hour, like the sleep stepper.
      return formatDuration(Math.round(value * 2) * 30, {
        hours: t('checkin.unitHours'),
        minutes: t('checkin.unitMinutes'),
      });
    case 'sleepQuality':
    case 'morningStiffness':
    case 'eveningPain':
    case 'activity':
      return t('insights.flares.outOfTen', { value: Number.isInteger(value) ? value : formatOneDecimal(value, locale) });
    case 'screenTime': {
      const bucket = SCREEN_TIME_BUCKETS.find((b) => b.id === screenTimeBucketId(value));
      return bucket ? t(bucket.labelKey) : String(value);
    }
    case 'steps':
      return t('insights.flares.steps', {
        value: new Intl.NumberFormat(locale === 'lt' ? 'lt-LT' : 'en-GB').format(Math.round(value / 100) * 100),
      });
    case 'trained':
      return t('insights.flares.trainedShare', { pct: Math.round(value * 100) });
  }
}

export function deviationLabel(deviation: Pick<Deviation, 'factor' | 'direction'>, t: Translate): string {
  return t(`insights.flares.lead.${factorKey(deviation.factor, deviation.direction)}`);
}

// "5 h · usually 7 h 30 min". Training has no meaningful "usual" value for a
// single day, so it's just the label.
export function deviationDetail(deviation: Deviation, t: Translate, locale: Locale): string | null {
  if (deviation.factor === 'trained') return null;
  return t('insights.flares.lead.valueVsUsual', {
    value: formatFactorValue(deviation.factor, deviation.value, t, locale),
    usual: formatFactorValue(deviation.factor, deviation.usual, t, locale),
  });
}

export function formatFlareDuration(minutes: number, t: Translate): string {
  const rounded = Math.max(15, Math.round(minutes / 15) * 15);
  if (rounded < 60) return `${rounded} ${t('checkin.unitMinutes')}`;
  return formatDuration(rounded, {
    hours: t('checkin.unitHours'),
    minutes: t('checkin.unitMinutes'),
  });
}
