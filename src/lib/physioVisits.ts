import type { PhysioAssessment } from '@/types/database.types';

// The latest visit's planned next visit has passed, and nothing newer has
// been logged (the latest visit *is* the newest, so a logged follow-up would
// have replaced it). Insights then asks "Did your visit on … happen?".
export function overdueNextVisit(
  latest: Pick<PhysioAssessment, 'visit_date' | 'next_visit_date'> | null | undefined,
  today: string,
): string | null {
  if (!latest?.next_visit_date) return null;
  const next = latest.next_visit_date;
  if (next >= today || next <= latest.visit_date) return null;
  return next;
}
