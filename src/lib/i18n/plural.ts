import type { Locale } from '@/store/useLocaleStore';

// The i18n layer has no plural rules (see CLAUDE.md), but Lithuanian day
// counts need them: "liko 2 dienos", "dar 2 dienas", "liko 21 diena".
// Small, scoped helper rather than a full plural system.

export type DayCountCase = 'nominative' | 'accusative';

type LtForms = [one: string, few: string, many: string];

const LT_DAY_FORMS: Record<DayCountCase, LtForms> = {
  nominative: ['diena', 'dienos', 'dienų'],
  accusative: ['dieną', 'dienas', 'dienų'],
};

function ltForm(count: number, forms: LtForms): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  const isTeen = mod100 >= 11 && mod100 <= 19;
  if (mod10 === 1 && !isTeen) return forms[0];
  if (mod10 >= 2 && mod10 <= 9 && !isTeen) return forms[1];
  return forms[2];
}

// "2 days" / "2 dienos" (nominative) / "2 dienas" (accusative).
export function formatDayCount(count: number, locale: Locale, grammaticalCase: DayCountCase = 'nominative'): string {
  if (locale === 'lt') return `${count} ${ltForm(count, LT_DAY_FORMS[grammaticalCase])}`;
  return `${count} ${count === 1 ? 'day' : 'days'}`;
}
