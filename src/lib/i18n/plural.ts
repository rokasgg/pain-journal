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

// Other counted nouns shown in Lithuanian copy: "7 vizitai", "6 pratimai".
export type CountNoun = 'visit' | 'exercise' | 'routine' | 'entry' | 'entryGen' | 'morning' | 'workoutGen';

const LT_NOUN_FORMS: Record<CountNoun, LtForms> = {
  visit: ['vizitas', 'vizitai', 'vizitų'],
  exercise: ['pratimas', 'pratimai', 'pratimų'],
  routine: ['treniruotė', 'treniruotės', 'treniruočių'],
  // Instrumental, for "Remiasi 9 įrašais" / "Remiasi 6 rytais".
  entry: ['įrašu', 'įrašais', 'įrašų'],
  morning: ['rytu', 'rytais', 'rytų'],
  // Genitive, after "po dar …" / "dar … treniruočių".
  entryGen: ['įrašo', 'įrašų', 'įrašų'],
  workoutGen: ['treniruotės', 'treniruočių', 'treniruočių'],
};

const EN_NOUN_FORMS: Record<CountNoun, [one: string, other: string]> = {
  visit: ['visit', 'visits'],
  exercise: ['exercise', 'exercises'],
  routine: ['routine', 'routines'],
  entry: ['entry', 'entries'],
  morning: ['morning', 'mornings'],
  entryGen: ['entry', 'entries'],
  workoutGen: ['workout', 'workouts'],
};

export function formatCount(count: number, noun: CountNoun, locale: Locale): string {
  if (locale === 'lt') return `${count} ${ltForm(count, LT_NOUN_FORMS[noun])}`;
  const [one, other] = EN_NOUN_FORMS[noun];
  return `${count} ${count === 1 ? one : other}`;
}
