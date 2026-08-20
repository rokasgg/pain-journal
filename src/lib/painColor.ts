// pain: 1-10 average for the day; null/undefined => no checkin, no color
export function getPainColor(pain: number | null | undefined, isDark: boolean): string | undefined {
  if (pain == null) return undefined;
  const t = Math.min(Math.max((pain - 1) / 9, 0), 1);
  const alpha = isDark ? 0.18 + t * 0.55 : 0.12 + t * 0.55;
  return `rgba(220, 38, 38, ${alpha.toFixed(2)})`;
}
