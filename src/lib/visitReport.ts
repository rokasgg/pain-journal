import { addDays, differenceInCalendarDays, format, parseISO, subDays } from 'date-fns';

import { FLARE_AREA_LABEL_KEYS, FLARE_SYMPTOM_LABEL_KEYS } from '@/constants/flareUp';
import { TRIGGER_LABEL_KEYS } from '@/constants/symptoms';
import { DATE_FNS_LOCALES, formatDayLabel, formatOneDecimal, formatShortDayLabel, toLocalDate } from '@/lib/dates';
import {
  analyzeFlareUps,
  buildBaseline,
  flareLeadUp,
  flareTriggers,
  type DetectiveCheckin,
  type DetectiveFlareUp,
} from '@/lib/flareDetective';
import {
  deviationDetail,
  deviationLabel,
  factorKey,
  formatFactorValue,
  formatFlareDuration,
} from '@/lib/flareDetectiveText';
import { formatCount, formatDayCount } from '@/lib/i18n/plural';
import { progressSinceStart, sleepVsMorningPain } from '@/lib/insightFindings';
import { dailyAverages, meanOfDays } from '@/lib/painTrend';
import { trainedDaySet, trainingReliefSummary } from '@/lib/trainingInsights';
import {
  DIAGNOSED_BY_OPTIONS,
  LIFE_STRESS_OPTIONS,
  SUSPECTED_TRIGGER_OPTIONS,
  WORK_HOURS_OPTIONS,
  WORK_TYPE_OPTIONS,
} from '@/constants/onboarding';
import type {
  Checkin,
  DiagnosedBy,
  ExerciseLog,
  FlareUp,
  LifeStress,
  PhysioAssessment,
  WorkHours,
  WorkType,
} from '@/types/database.types';
import type { Locale } from '@/store/useLocaleStore';

// "Prepare a summary for the visit" (Insights → Physio): the user's own data
// since the last visit, as a printable HTML page that expo-print turns into a
// PDF. No AI: every number is something the user logged, or a plain average
// of it, so it's free to make and never speculates. Order: at a glance (vs
// the same-length period before), a pain chart, flare-ups with what was
// unusual before each one (flareDetective.ts), what seems to help or hurt,
// the user's open questions, notes, and the day-by-day table as an appendix.
// The AI physio summary stays a separate report.

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

export type ReportCheckin = DetectiveCheckin & Pick<Checkin, 'notes' | 'range_of_motion'>;
export type ReportFlareUp = DetectiveFlareUp & Pick<FlareUp, 'pain_areas' | 'symptoms' | 'description'>;

export interface VisitReportInput {
  period: VisitReportPeriod;
  // All history the caller has (the previous period and the flare-up
  // baseline reach back before `period.from`).
  checkins: ReportCheckin[];
  flareUps: ReportFlareUp[];
  injuryDescription?: string | null;
  // The professional's diagnosis as the user recorded it (Injury info).
  diagnosis?: { text: string; by: DiagnosedBy | null; on: string | null; notes: string | null } | null;
  // Settings → About me: one "About me" line, left out when nothing's answered.
  aboutMe?: {
    workType: WorkType | null;
    workHours: WorkHours | null;
    lifeStress: LifeStress | null;
    suspectedTriggers: string[];
  } | null;
  // Chat answers the user added to the summary (usePhysioNotesStore).
  chatNotes?: { question: string; text: string }[];
  // Questions still open from the last visit's question list.
  openQuestions?: string[];
  // Training sessions, or null/undefined when training isn't tracked.
  exerciseLogs?: Pick<ExerciseLog, 'logged_at' | 'status' | 'pain_before' | 'pain_after'>[] | null;
  // Finished experiments in this period, already worded by the caller.
  experiments?: { title: string; summary: string }[];
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

const CHART_WIDTH = 540;
const CHART_HEIGHT = 150;
const CHART_LEFT = 24;
const CHART_TOP = 10;
const CHART_BOTTOM = 22;
const FLARE_RED = '#B42318';
const LINE_GREEN = '#2F5A41';

// Daily average pain as an inline SVG line (expo-print renders SVG), with a
// red tick for each flare-up day. Days without a check-in break the line, so a
// gap never reads as a smooth trend.
export function painChartSvg(
  averages: Map<string, number>,
  period: Pick<VisitReportPeriod, 'from' | 'to'>,
  flareDays: string[],
  labels: { from: string; to: string },
): string {
  const totalDays = differenceInCalendarDays(parseISO(period.to), parseISO(period.from)) + 1;
  const plotWidth = CHART_WIDTH - CHART_LEFT - 8;
  const plotHeight = CHART_HEIGHT - CHART_TOP - CHART_BOTTOM;
  const x = (day: string) =>
    CHART_LEFT +
    (totalDays <= 1
      ? plotWidth / 2
      : (differenceInCalendarDays(parseISO(day), parseISO(period.from)) / (totalDays - 1)) * plotWidth);
  const y = (value: number) => CHART_TOP + plotHeight - (value / 10) * plotHeight;

  const segments: string[][] = [];
  let current: string[] = [];
  for (let i = 0; i < totalDays; i++) {
    const day = format(addDays(parseISO(period.from), i), 'yyyy-MM-dd');
    const value = averages.get(day);
    if (value === undefined) {
      if (current.length > 0) segments.push(current);
      current = [];
      continue;
    }
    current.push(`${x(day).toFixed(1)},${y(value).toFixed(1)}`);
  }
  if (current.length > 0) segments.push(current);

  const grid = [0, 5, 10]
    .map(
      (v) =>
        `<line x1="${CHART_LEFT}" x2="${CHART_WIDTH - 8}" y1="${y(v)}" y2="${y(v)}" stroke="#E3E8E4" stroke-width="1"/>` +
        `<text x="${CHART_LEFT - 6}" y="${y(v) + 3}" font-size="9" fill="#5B6660" text-anchor="end">${v}</text>`,
    )
    .join('');
  const flares = flareDays
    .filter((day) => day >= period.from && day <= period.to)
    .map(
      (day) =>
        `<line x1="${x(day).toFixed(1)}" x2="${x(day).toFixed(1)}" y1="${CHART_TOP}" y2="${CHART_TOP + plotHeight}" stroke="${FLARE_RED}" stroke-width="1" stroke-dasharray="3,3"/>` +
        `<circle cx="${x(day).toFixed(1)}" cy="${CHART_TOP}" r="3.5" fill="${FLARE_RED}"/>`,
    )
    .join('');
  const lines = segments
    .map((points) =>
      points.length === 1
        ? `<circle cx="${points[0].split(',')[0]}" cy="${points[0].split(',')[1]}" r="2.5" fill="${LINE_GREEN}"/>`
        : `<polyline points="${points.join(' ')}" fill="none" stroke="${LINE_GREEN}" stroke-width="2" stroke-linejoin="round"/>`,
    )
    .join('');
  const axis =
    `<text x="${CHART_LEFT}" y="${CHART_HEIGHT - 6}" font-size="9" fill="#5B6660">${escapeHtml(labels.from)}</text>` +
    `<text x="${CHART_WIDTH - 8}" y="${CHART_HEIGHT - 6}" font-size="9" fill="#5B6660" text-anchor="end">${escapeHtml(labels.to)}</text>`;

  return `<svg width="${CHART_WIDTH}" height="${CHART_HEIGHT}" viewBox="0 0 ${CHART_WIDTH} ${CHART_HEIGHT}" xmlns="http://www.w3.org/2000/svg">${grid}${flares}${lines}${axis}</svg>`;
}

function previousWindow(period: VisitReportPeriod): { from: string; to: string; days: number } {
  const days = differenceInCalendarDays(parseISO(period.to), parseISO(period.from)) + 1;
  return {
    from: format(subDays(parseISO(period.from), days), 'yyyy-MM-dd'),
    to: format(subDays(parseISO(period.from), 1), 'yyyy-MM-dd'),
    days,
  };
}

const MIN_DAYS_TO_COMPARE = 3;

const labelOf = <T extends string>(options: { value: T; labelKey: string }[], value: T | null, t: Translate) => {
  const option = options.find((o) => o.value === value);
  return option ? t(option.labelKey) : null;
};

// "Diagnosis (per physiotherapist, 12 Oct 2026): C5–C6 disc protrusion",
// exactly as the user recorded it, plus their notes.
function diagnosisHtml(
  diagnosis: VisitReportInput['diagnosis'],
  t: Translate,
  dfLocale: { locale: (typeof DATE_FNS_LOCALES)[Locale] },
): string {
  if (!diagnosis?.text.trim()) return '';
  const by = labelOf(DIAGNOSED_BY_OPTIONS, diagnosis.by, t)?.toLocaleLowerCase();
  const on = diagnosis.on ? format(parseISO(diagnosis.on), 'd MMM yyyy', dfLocale) : null;
  const label =
    by && on
      ? t('visitReport.diagnosisByOn', { by, date: on })
      : by
        ? t('visitReport.diagnosisBy', { by })
        : on
          ? t('visitReport.diagnosisOn', { date: on })
          : t('visitReport.diagnosis');
  const notes = diagnosis.notes?.trim() ? `<div class="muted">${escapeHtml(diagnosis.notes.trim())}</div>` : '';
  return `<p><b>${escapeHtml(label)}:</b> ${escapeHtml(diagnosis.text.trim())}${notes}</p>`;
}

// "About me: Mostly sitting, 8 h or more · usual stress: high · thinks
// sitting, screens make it worse".
function aboutMeHtml(aboutMe: VisitReportInput['aboutMe'], t: Translate): string {
  if (!aboutMe) return '';
  const parts: string[] = [];
  const work = labelOf(WORK_TYPE_OPTIONS, aboutMe.workType, t);
  const hours = labelOf(WORK_HOURS_OPTIONS, aboutMe.workHours, t);
  if (work) parts.push(hours ? `${work}, ${hours.toLocaleLowerCase()}` : work);
  const stress = labelOf(LIFE_STRESS_OPTIONS, aboutMe.lifeStress, t);
  if (stress) parts.push(t('visitReport.usualStress', { level: stress.toLocaleLowerCase() }));
  const hunches = aboutMe.suspectedTriggers
    .filter((h) => h !== 'dont_know')
    .map((h) => labelOf(SUSPECTED_TRIGGER_OPTIONS, h, t)?.toLocaleLowerCase())
    .filter((h): h is string => !!h);
  if (hunches.length > 0) parts.push(t('visitReport.thinksWorse', { list: hunches.join(', ') }));
  if (parts.length === 0) return '';
  return `<p class="muted">${escapeHtml(t('visitReport.aboutMe', { text: parts.join(' · ') }))}</p>`;
}

// "Since starting the journal (1 Sep): average pain 5.8 → 3.4", from the same
// progressSinceStart() as the Insights finding.
function sinceStartHtml(
  checkins: ReportCheckin[],
  t: Translate,
  locale: Locale,
  dfLocale: { locale: (typeof DATE_FNS_LOCALES)[Locale] },
): string {
  const progress = progressSinceStart(checkins);
  if (progress.status !== 'ready') return '';
  return `<p>${escapeHtml(
    t('visitReport.sinceStart', {
      date: format(parseISO(progress.startedOn), 'd MMM yyyy', dfLocale),
      start: formatOneDecimal(progress.pain.start, locale),
      now: formatOneDecimal(progress.pain.now, locale),
      count: progress.windowDays,
    }),
  )}</p>`;
}

export function buildVisitReportHtml({
  period,
  checkins,
  flareUps,
  injuryDescription,
  diagnosis,
  aboutMe,
  chatNotes = [],
  openQuestions = [],
  exerciseLogs,
  experiments = [],
  locale,
  t,
}: VisitReportInput): string {
  const dfLocale = { locale: DATE_FNS_LOCALES[locale] };
  const inRange = (day: string, from: string, to: string) => day >= from && day <= to;
  const inPeriod = checkins
    .filter((c) => inRange(c.checkin_date, period.from, period.to))
    .sort((a, b) => a.checkin_date.localeCompare(b.checkin_date));
  const flaresInPeriod = flareUps
    .filter((f) => inRange(toLocalDate(f.occurred_at), period.from, period.to))
    .sort((a, b) => a.occurred_at.localeCompare(b.occurred_at));

  const averages = dailyAverages(inPeriod);
  const days = [...averages.keys()].sort();
  const avgPain = days.length > 0 ? [...averages.values()].reduce((s, v) => s + v, 0) / days.length : null;
  const painFree = [...averages.values()].filter((v) => v === 0).length;
  const totalDays = differenceInCalendarDays(parseISO(period.to), parseISO(period.from)) + 1;
  const stiffness = meanOfDays(dailyAverages(inPeriod, 'stiffness_level'), period.from, period.to);
  const mobility = meanOfDays(dailyAverages(inPeriod, 'range_of_motion'), period.from, period.to);

  // The same-length window right before the period, when there's enough of it.
  const previous = previousWindow(period);
  const previousPain = meanOfDays(dailyAverages(checkins), previous.from, previous.to);
  const canCompare = previousPain.days >= MIN_DAYS_TO_COMPARE && days.length >= MIN_DAYS_TO_COMPARE;
  const previousFlares = flareUps.filter((f) => inRange(toLocalDate(f.occurred_at), previous.from, previous.to)).length;
  const previousPainFree = [...dailyAverages(checkins).entries()].filter(
    ([day, v]) => inRange(day, previous.from, previous.to) && v === 0,
  ).length;
  const before = (value: string) =>
    canCompare ? `<span class="before">${escapeHtml(t('visitReport.before', { value }))}</span>` : '';

  const dayLabel = (date: string) => formatDayLabel(parseISO(date), locale);
  const pain = (value: number | undefined) => (value === undefined ? '—' : String(value));
  const label = (keys: Record<string, string>, value: string) => (keys[value] ? t(keys[value]) : value);

  // Flare-up detective, as of the end of the period.
  const trainedDays = exerciseLogs && exerciseLogs.length > 0 ? trainedDaySet(exerciseLogs) : null;
  const detectiveInput = { checkins, flareUps, trainedDays, today: period.to };
  const baseline = buildBaseline(detectiveInput);
  const detective = analyzeFlareUps(detectiveInput);

  const flareRows = flaresInPeriod
    .map((f) => {
      const when = `${dayLabel(toLocalDate(f.occurred_at))}, ${format(parseISO(f.occurred_at), 'HH:mm', dfLocale)}`;
      const details = [
        (f.pain_areas ?? []).map((v) => label(FLARE_AREA_LABEL_KEYS, v)).join(', '),
        (f.symptoms ?? []).map((v) => label(FLARE_SYMPTOM_LABEL_KEYS, v)).join(', '),
        flareTriggers(f)
          .map((v) => label(TRIGGER_LABEL_KEYS, v))
          .join(', '),
        f.resolved_duration_minutes
          ? t('visitReport.lasted', { duration: formatFlareDuration(f.resolved_duration_minutes, t) })
          : '',
        f.description?.trim() ?? '',
      ]
        .filter(Boolean)
        .map(escapeHtml)
        .join('<br/>');
      const leadUp = flareLeadUp(f, checkins, baseline, trainedDays);
      const beforeIt =
        leadUp.deviations.length > 0
          ? leadUp.deviations
              .map((d) => {
                const detail = deviationDetail(d, t, locale);
                return `${escapeHtml(deviationLabel(d, t))}${detail ? ` <span class="muted">(${escapeHtml(detail)})</span>` : ''}`;
              })
              .join('<br/>')
          : `<span class="muted">${escapeHtml(
              t(leadUp.checked === 0 ? 'insights.flares.lead.nothingLogged' : 'insights.flares.lead.nothingUnusual'),
            )}</span>`;
      return `<tr><td>${escapeHtml(when)}</td><td>${f.pain_level}/10</td><td>${details || '—'}</td><td>${beforeIt}</td></tr>`;
    })
    .join('');

  const patternItems =
    detective.status === 'ready'
      ? detective.patterns
          .map(
            (p) =>
              `<li>${escapeHtml(
                t('insights.flares.patternSentence', {
                  hits: p.hits,
                  total: formatCount(p.total, 'flareUpOf', locale),
                  what: t(`insights.flares.what.${factorKey(p.factor, p.direction)}`),
                }),
              )}${
                p.factor !== 'trained'
                  ? ` <span class="muted">${escapeHtml(
                      t('insights.flares.usual', { value: formatFactorValue(p.factor, p.usual, t, locale) }),
                    )}</span>`
                  : ''
              }</li>`,
          )
          .join('')
      : '';
  const triggerLine =
    detective.status === 'ready' && detective.triggers.length > 0
      ? `<li>${escapeHtml(
          t('insights.flares.triggers', {
            list: detective.triggers.map((x) => `${label(TRIGGER_LABEL_KEYS, x.trigger)} (${x.count})`).join(', '),
          }),
        )}</li>`
      : '';
  const timeLine =
    detective.status === 'ready' && detective.timeOfDay
      ? `<li>${escapeHtml(t('insights.flares.timeOfDay', { when: t(`insights.flares.when.${detective.timeOfDay}`) }))}</li>`
      : '';

  // "What seems to help or hurt": experiments, training, sleep.
  const helpItems: string[] = experiments.map(
    (e) => `<li><b>${escapeHtml(e.title)}</b><br/>${escapeHtml(e.summary)}</li>`,
  );
  if (exerciseLogs) {
    const inPeriodLogs = exerciseLogs.filter((log) => inRange(toLocalDate(log.logged_at), period.from, period.to));
    const sessions = trainedDaySet(inPeriodLogs).size;
    if (sessions > 0) {
      helpItems.push(
        `<li>${escapeHtml(
          t('visitReport.trainingSessions', {
            count: sessions,
            perWeek: formatOneDecimal((sessions / totalDays) * 7, locale),
          }),
        )}</li>`,
      );
    }
    const relief = trainingReliefSummary(inPeriodLogs);
    if (relief) {
      const change = -relief.avgDrop;
      helpItems.push(
        `<li>${escapeHtml(
          t('visitReport.trainingRelief', {
            change: `${change > 0 ? '+' : change < 0 ? '−' : ''}${formatOneDecimal(Math.abs(change), locale)}`,
            sessions: relief.sessions,
          }),
        )}</li>`,
      );
    }
  }
  const sleep = sleepVsMorningPain(inPeriod, period.to, totalDays);
  if (sleep.status === 'ready') {
    helpItems.push(
      `<li>${escapeHtml(
        t('insights.sleepFinding', {
          word: t(
            sleep.direction === 'higher'
              ? 'insights.sleepHigher'
              : sleep.direction === 'lower'
                ? 'insights.sleepLower'
                : 'insights.sleepSimilar',
          ),
        }),
      )} <span class="muted">(${escapeHtml(formatOneDecimal(sleep.afterPoor, locale))} / ${escapeHtml(
        formatOneDecimal(sleep.afterGood, locale),
      )})</span></li>`,
    );
  }

  const painRows = days
    .map((date) => {
      const morning = inPeriod.find((c) => c.checkin_date === date && c.type === 'morning');
      const evening = inPeriod.find((c) => c.checkin_date === date && c.type === 'evening');
      return `<tr><td>${escapeHtml(dayLabel(date))}</td><td>${pain(morning?.pain_level)}</td><td>${pain(
        evening?.pain_level,
      )}</td><td>${formatOneDecimal(averages.get(date) ?? 0, locale)}</td></tr>`;
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

  const questionItems = openQuestions
    .map((q) => q.trim())
    .filter(Boolean)
    .map((q) => `<li>${escapeHtml(q)}</li>`)
    .join('');

  const chatNoteItems = chatNotes
    .map((n) => `<li><b>${escapeHtml(n.question)}</b><br/>${escapeHtml(n.text)}</li>`)
    .join('');

  const periodText = `${dayLabel(period.from)} – ${dayLabel(period.to)}`;
  const shortLabel = (date: string) => formatShortDayLabel(parseISO(date), locale);
  const chart =
    days.length > 0
      ? painChartSvg(
          averages,
          period,
          flaresInPeriod.map((f) => toLocalDate(f.occurred_at)),
          { from: shortLabel(period.from), to: shortLabel(period.to) },
        )
      : '';
  const section = (title: string) => `<h2>${escapeHtml(t(title))}</h2>`;

  return `<!DOCTYPE html>
<html lang="${locale}">
<head>
<meta charset="utf-8" />
<style>
  body { font-family: -apple-system, Roboto, Helvetica, Arial, sans-serif; color: #1C2420; margin: 32px; font-size: 12px; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  h2 { font-size: 15px; margin: 24px 0 8px; color: #2F5A41; }
  .muted { color: #5B6660; }
  .stats { display: flex; flex-wrap: wrap; gap: 24px; margin-top: 16px; }
  .stat b { display: block; font-size: 18px; }
  .before { display: block; color: #5B6660; font-size: 11px; }
  table { width: 100%; border-collapse: collapse; }
  th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid #E3E8E4; vertical-align: top; }
  th { color: #5B6660; font-weight: 600; }
  ul { padding-left: 18px; }
  li { margin-bottom: 6px; }
  .appendix { page-break-before: always; }
</style>
</head>
<body>
  <h1>${escapeHtml(t('visitReport.title'))}</h1>
  <div class="muted">${escapeHtml(
    t(period.sinceLastVisit ? 'visitReport.periodSinceVisit' : 'visitReport.periodLast30', { period: periodText }),
  )}</div>
  ${diagnosisHtml(diagnosis, t, dfLocale)}
  ${aboutMeHtml(aboutMe, t)}
  ${injuryDescription?.trim() ? `<p>${escapeHtml(injuryDescription.trim())}</p>` : ''}

  ${section('visitReport.glanceSection')}
  <div class="stats">
    <div class="stat"><b>${avgPain === null ? '—' : `${formatOneDecimal(avgPain, locale)}/10`}</b>${escapeHtml(
      t('visitReport.avgPain'),
    )}${before(`${formatOneDecimal(previousPain.mean, locale)}/10`)}</div>
    <div class="stat"><b>${days.length}/${totalDays}</b>${escapeHtml(t('visitReport.daysLogged'))}</div>
    <div class="stat"><b>${painFree}</b>${escapeHtml(t('visitReport.painFreeDays'))}${before(String(previousPainFree))}</div>
    <div class="stat"><b>${flaresInPeriod.length}</b>${escapeHtml(t('visitReport.flareUps'))}${before(String(previousFlares))}</div>
    ${
      stiffness.days > 0
        ? `<div class="stat"><b>${formatOneDecimal(stiffness.mean, locale)}/10</b>${escapeHtml(t('visitReport.avgStiffness'))}</div>`
        : ''
    }
    ${
      mobility.days > 0
        ? `<div class="stat"><b>${formatOneDecimal(mobility.mean, locale)}/10</b>${escapeHtml(t('visitReport.avgMobility'))}</div>`
        : ''
    }
  </div>
  ${sinceStartHtml(checkins, t, locale, dfLocale)}
  ${
    canCompare
      ? `<p class="muted">${escapeHtml(t('visitReport.beforeExplained', { count: formatDayCount(previous.days, locale) }))}</p>`
      : ''
  }

  ${section('visitReport.chartSection')}
  ${chart ? `${chart}<p class="muted">${escapeHtml(t('visitReport.chartLegend'))}</p>` : `<p class="muted">${escapeHtml(t('visitReport.noCheckins'))}</p>`}

  ${section('visitReport.flareSection')}
  ${
    flareRows
      ? `<table><tr><th>${escapeHtml(t('visitReport.colWhen'))}</th><th>${escapeHtml(t('visitReport.colPain'))}</th><th>${escapeHtml(
          t('visitReport.colDetails'),
        )}</th><th>${escapeHtml(t('visitReport.colBefore'))}</th></tr>${flareRows}</table>`
      : `<p class="muted">${escapeHtml(t('visitReport.noFlareUps'))}</p>`
  }
  ${
    patternItems || triggerLine || timeLine
      ? `<h3>${escapeHtml(t('visitReport.flarePatterns'))}</h3><ul>${patternItems}${triggerLine}${timeLine}</ul>`
      : ''
  }

  ${helpItems.length > 0 ? `${section('visitReport.helpSection')}<ul>${helpItems.join('')}</ul>` : ''}

  ${questionItems ? `${section('visitReport.questionsSection')}<ul>${questionItems}</ul>` : ''}

  ${section('visitReport.notesSection')}
  ${notes ? `<ul>${notes}</ul>` : `<p class="muted">${escapeHtml(t('visitReport.noNotes'))}</p>`}

  ${chatNoteItems ? `${section('visitReport.assistantSection')}<ul>${chatNoteItems}</ul>` : ''}

  ${
    painRows
      ? `<div class="appendix">${section('visitReport.painSection')}<table><tr><th>${escapeHtml(
          t('visitReport.colDate'),
        )}</th><th>${escapeHtml(t('home.morning'))}</th><th>${escapeHtml(t('home.evening'))}</th><th>${escapeHtml(
          t('visitReport.colAvg'),
        )}</th></tr>${painRows}</table></div>`
      : ''
  }

  <p class="muted" style="margin-top: 32px;">${escapeHtml(t('visitReport.footer'))}</p>
</body>
</html>`;
}
