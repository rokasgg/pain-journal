import { differenceInCalendarDays, format, parseISO, subDays } from 'date-fns';

import { DATE_FNS_LOCALES, formatDayLabel, formatOneDecimal, toLocalDate } from '@/lib/dates';
import { dailyAverages } from '@/lib/painTrend';
import type { Checkin, FlareUp, PhysioAssessment } from '@/types/database.types';
import type { Locale } from '@/store/useLocaleStore';

// "Prepare a summary for the visit" (Insights → Physio): the user's own data
// since the last visit, as a printable HTML page that expo-print turns into a
// PDF. No AI — just what was logged — so it's free to make and exactly what
// the user entered. The AI physio summary stays a separate report.

const FALLBACK_DAYS = 30; // no visit logged yet

export interface VisitReportPeriod {
  from: string; // yyyy-MM-dd, inclusive
  to: string; // yyyy-MM-dd, inclusive (today)
  sinceLastVisit: boolean;
}

export function visitReportPeriod(
  latestVisit: Pick<PhysioAssessment, 'visit_date'> | null | undefined,
  today: string,
): VisitReportPeriod {
  if (latestVisit && latestVisit.visit_date <= today) {
    return { from: latestVisit.visit_date, to: today, sinceLastVisit: true };
  }
  return { from: format(subDays(parseISO(today), FALLBACK_DAYS - 1), 'yyyy-MM-dd'), to: today, sinceLastVisit: false };
}

type Translate = (key: string, vars?: Record<string, string | number>) => string;

export interface VisitReportInput {
  period: VisitReportPeriod;
  checkins: Pick<Checkin, 'checkin_date' | 'type' | 'pain_level' | 'notes'>[];
  flareUps: Pick<FlareUp, 'occurred_at' | 'pain_level' | 'likely_cause' | 'description'>[];
  injuryDescription?: string | null;
  locale: Locale;
  t: Translate;
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function buildVisitReportHtml({ period, checkins, flareUps, injuryDescription, locale, t }: VisitReportInput): string {
  const dfLocale = { locale: DATE_FNS_LOCALES[locale] };
  const inPeriod = checkins
    .filter((c) => c.checkin_date >= period.from && c.checkin_date <= period.to)
    .sort((a, b) => a.checkin_date.localeCompare(b.checkin_date));
  const flaresInPeriod = flareUps
    .filter((f) => {
      const day = toLocalDate(f.occurred_at);
      return day >= period.from && day <= period.to;
    })
    .sort((a, b) => a.occurred_at.localeCompare(b.occurred_at));

  const averages = dailyAverages(inPeriod);
  const days = [...averages.keys()].sort();
  const avgPain = days.length > 0 ? [...averages.values()].reduce((s, v) => s + v, 0) / days.length : null;
  const painFree = [...averages.values()].filter((v) => v === 0).length;
  const totalDays = differenceInCalendarDays(parseISO(period.to), parseISO(period.from)) + 1;

  const dayLabel = (date: string) => formatDayLabel(parseISO(date), locale);
  const pain = (value: number | undefined) => (value === undefined ? '—' : String(value));

  const painRows = days
    .map((date) => {
      const morning = inPeriod.find((c) => c.checkin_date === date && c.type === 'morning');
      const evening = inPeriod.find((c) => c.checkin_date === date && c.type === 'evening');
      return `<tr><td>${escapeHtml(dayLabel(date))}</td><td>${pain(morning?.pain_level)}</td><td>${pain(
        evening?.pain_level,
      )}</td><td>${formatOneDecimal(averages.get(date) ?? 0, locale)}</td></tr>`;
    })
    .join('');

  const flareRows = flaresInPeriod
    .map((f) => {
      const when = `${dayLabel(toLocalDate(f.occurred_at))}, ${format(parseISO(f.occurred_at), 'HH:mm', dfLocale)}`;
      const detail = [f.likely_cause, f.description].filter(Boolean).join(' — ');
      return `<tr><td>${escapeHtml(when)}</td><td>${f.pain_level}/10</td><td>${escapeHtml(detail || '—')}</td></tr>`;
    })
    .join('');

  const notes = inPeriod
    .filter((c) => c.notes?.trim())
    .map(
      (c) =>
        `<li><b>${escapeHtml(dayLabel(c.checkin_date))} · ${escapeHtml(
          t(c.type === 'morning' ? 'home.morning' : 'home.evening'),
        )}:</b> ${escapeHtml(c.notes!.trim())}</li>`,
    )
    .join('');

  const periodText = `${dayLabel(period.from)} – ${dayLabel(period.to)}`;

  return `<!DOCTYPE html>
<html lang="${locale}">
<head>
<meta charset="utf-8" />
<style>
  body { font-family: -apple-system, Roboto, Helvetica, Arial, sans-serif; color: #1C2420; margin: 32px; font-size: 12px; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  h2 { font-size: 15px; margin: 24px 0 8px; color: #2F5A41; }
  .muted { color: #5B6660; }
  .stats { display: flex; gap: 24px; margin-top: 16px; }
  .stat b { display: block; font-size: 18px; }
  table { width: 100%; border-collapse: collapse; }
  th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid #E3E8E4; vertical-align: top; }
  th { color: #5B6660; font-weight: 600; }
  ul { padding-left: 18px; }
  li { margin-bottom: 6px; }
</style>
</head>
<body>
  <h1>${escapeHtml(t('visitReport.title'))}</h1>
  <div class="muted">${escapeHtml(
    t(period.sinceLastVisit ? 'visitReport.periodSinceVisit' : 'visitReport.periodLast30', { period: periodText }),
  )}</div>
  ${injuryDescription?.trim() ? `<p>${escapeHtml(injuryDescription.trim())}</p>` : ''}
  <div class="stats">
    <div class="stat"><b>${avgPain === null ? '—' : `${formatOneDecimal(avgPain, locale)}/10`}</b>${escapeHtml(t('visitReport.avgPain'))}</div>
    <div class="stat"><b>${days.length}/${totalDays}</b>${escapeHtml(t('visitReport.daysLogged'))}</div>
    <div class="stat"><b>${painFree}</b>${escapeHtml(t('visitReport.painFreeDays'))}</div>
    <div class="stat"><b>${flaresInPeriod.length}</b>${escapeHtml(t('visitReport.flareUps'))}</div>
  </div>

  <h2>${escapeHtml(t('visitReport.painSection'))}</h2>
  ${
    painRows
      ? `<table><tr><th>${escapeHtml(t('visitReport.colDate'))}</th><th>${escapeHtml(t('home.morning'))}</th><th>${escapeHtml(
          t('home.evening'),
        )}</th><th>${escapeHtml(t('visitReport.colAvg'))}</th></tr>${painRows}</table>`
      : `<p class="muted">${escapeHtml(t('visitReport.noCheckins'))}</p>`
  }

  <h2>${escapeHtml(t('visitReport.flareSection'))}</h2>
  ${
    flareRows
      ? `<table><tr><th>${escapeHtml(t('visitReport.colWhen'))}</th><th>${escapeHtml(t('visitReport.colPain'))}</th><th>${escapeHtml(
          t('visitReport.colDetails'),
        )}</th></tr>${flareRows}</table>`
      : `<p class="muted">${escapeHtml(t('visitReport.noFlareUps'))}</p>`
  }

  <h2>${escapeHtml(t('visitReport.notesSection'))}</h2>
  ${notes ? `<ul>${notes}</ul>` : `<p class="muted">${escapeHtml(t('visitReport.noNotes'))}</p>`}

  <p class="muted" style="margin-top: 32px;">${escapeHtml(t('visitReport.footer'))}</p>
</body>
</html>`;
}
