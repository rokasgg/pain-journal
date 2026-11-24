import { addDays, format, parseISO } from 'date-fns';

import {
  buildVisitReportHtml,
  escapeHtml,
  painChartSvg,
  visitReportPeriod,
  type ReportCheckin,
  type ReportFlareUp,
} from '@/lib/visitReport';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const TODAY = '2026-10-27';
const t = (key: string, vars?: Record<string, string | number>) =>
  vars ? `${key}(${Object.values(vars).join(',')})` : key;

function checkin(
  checkin_date: string,
  type: 'morning' | 'evening',
  pain_level: number,
  notes: string | null = null,
  extra: Partial<ReportCheckin> = {},
): ReportCheckin {
  return {
    checkin_date,
    type,
    pain_level,
    notes,
    stiffness_level: null,
    range_of_motion: null,
    sleep_hours: null,
    sleep_quality: null,
    screen_time_hours: null,
    activity_level: null,
    steps: null,
    created_at: `${checkin_date}T${type === 'morning' ? '08' : '21'}:00:00`,
    ...extra,
  };
}

function flareUp(
  occurred_at: string,
  pain_level: number,
  likely_cause: string | null,
  extra: Partial<ReportFlareUp> = {},
): ReportFlareUp {
  return {
    id: occurred_at,
    occurred_at,
    pain_level,
    likely_cause,
    description: null,
    triggers: [],
    pain_areas: [],
    symptoms: [],
    resolved_duration_minutes: null,
    ...extra,
  };
}

describe('visitReportPeriod', () => {
  it('runs from the last visit to today', () => {
    expect(visitReportPeriod({ visit_date: '2026-10-13' }, TODAY)).toEqual({
      from: '2026-10-13',
      to: TODAY,
      sinceLastVisit: true,
    });
  });

  it('falls back to the last 30 days without a visit', () => {
    expect(visitReportPeriod(null, TODAY)).toEqual({ from: '2026-09-28', to: TODAY, sinceLastVisit: false });
  });
});

describe('buildVisitReportHtml', () => {
  const html = buildVisitReportHtml({
    period: { from: '2026-10-13', to: TODAY, sinceLastVisit: true },
    checkins: [
      checkin('2026-10-12', 'morning', 9, 'before the period'),
      checkin('2026-10-14', 'morning', 6, 'Stiff <neck> & shoulders'),
      checkin('2026-10-14', 'evening', 2),
      checkin('2026-10-15', 'evening', 0, '  '),
    ],
    flareUps: [flareUp('2026-10-20T08:30:00', 8, 'Lifting'), flareUp('2026-10-01T08:30:00', 7, 'old')],
    injuryDescription: 'C5–C6 disc',
    locale: 'en',
    t,
  });

  it('covers only the period', () => {
    expect(html).not.toContain('before the period');
    expect(html).not.toContain('old');
    expect(html).toContain('Lifting');
  });

  it('summarises average pain, logged days, pain-free days and flare-ups', () => {
    expect(html).toContain('<b>2.0/10</b>'); // (4 + 0) / 2 days
    expect(html).toContain('<b>2/15</b>');
    expect(html).toContain('visitReport.periodSinceVisit(');
  });

  it('escapes notes and skips blank ones', () => {
    expect(html).toContain('Stiff &lt;neck&gt; &amp; shoulders');
    expect(html.match(/<li>/g)).toHaveLength(1);
  });

  it('includes the injury description', () => {
    expect(html).toContain('C5–C6 disc');
  });

  it('draws the pain chart and says when nothing was logged before a flare-up', () => {
    expect(html).toContain('<svg');
    expect(html).toContain('insights.flares.lead.nothingLogged');
  });

  it('skips the comparison when the previous period has too little data', () => {
    expect(html).not.toContain('visitReport.before(');
  });

  it('leaves out sections with nothing in them', () => {
    expect(html).not.toContain('visitReport.questionsSection');
    expect(html).not.toContain('visitReport.helpSection');
  });
});

describe('buildVisitReportHtml with more history', () => {
  const period = { from: '2026-10-14', to: TODAY, sinceLastVisit: true };
  const checkins: ReportCheckin[] = [];
  // 14 days before the period at pain 6, then the period at pain 3.
  for (let d = 0; d < 28; d++) {
    const date = format(addDays(parseISO('2026-09-30'), d), 'yyyy-MM-dd');
    checkins.push(checkin(date, 'morning', date < '2026-10-14' ? 6 : 3, null, { stiffness_level: 4 }));
  }
  const html = buildVisitReportHtml({
    period,
    checkins,
    flareUps: [flareUp('2026-10-20T19:00:00', 8, null, { triggers: ['Stress'], resolved_duration_minutes: 150 })],
    openQuestions: ['Can I run again?', '  '],
    exerciseLogs: [
      { logged_at: '2026-10-15T10:00:00', status: 'FULL', pain_before: 5, pain_after: 3 },
      { logged_at: '2026-10-17T10:00:00', status: 'FULL', pain_before: 4, pain_after: 3 },
      { logged_at: '2026-10-19T10:00:00', status: 'PARTIAL', pain_before: 4, pain_after: 4 },
    ],
    experiments: [{ title: 'No screens after 22:00', summary: 'Pain 3.1 vs 4.0' }],
    locale: 'en',
    t,
  });

  it('compares with the period before', () => {
    expect(html).toContain('visitReport.before(6.0/10)');
    expect(html).toContain('visitReport.beforeExplained(14 days)');
  });

  it('shows stiffness, flare-up details and duration', () => {
    expect(html).toContain('visitReport.avgStiffness');
    expect(html).toContain('visitReport.lasted(2 checkin.unitHours 30 checkin.unitMinutes)');
  });

  it('lists training, experiments and open questions, skipping blank ones', () => {
    expect(html).toContain('visitReport.trainingSessions(3,');
    expect(html).toContain('visitReport.trainingRelief(−1.0,3)');
    expect(html).toContain('No screens after 22:00');
    expect(html).toContain('<li>Can I run again?</li>');
  });
});

describe('buildVisitReportHtml diagnosis, about me and progress', () => {
  const base = {
    period: { from: '2026-10-13', to: TODAY, sinceLastVisit: true },
    flareUps: [],
    locale: 'en' as const,
    t,
  };

  it('prints the diagnosis as recorded, escaped, with who and when', () => {
    const html = buildVisitReportHtml({
      ...base,
      checkins: [],
      diagnosis: { text: 'C5–C6 <protrusion>', by: 'physio', on: '2026-10-12', notes: 'No lifting' },
    });
    expect(html).toContain('visitReport.diagnosisByOn(onboarding.byphysio,12 Oct 2026)');
    expect(html).toContain('C5–C6 &lt;protrusion&gt;');
    expect(html).toContain('No lifting');
  });

  it('builds the About me line and skips "I don\'t know"', () => {
    const html = buildVisitReportHtml({
      ...base,
      checkins: [],
      aboutMe: {
        workType: 'sitting',
        workHours: '8_plus',
        lifeStress: 'high',
        suspectedTriggers: ['screens', 'dont_know'],
      },
    });
    expect(html).toContain('onboarding.workSitting, onboarding.hours8plus');
    expect(html).toContain('visitReport.usualStress(onboarding.stresshigh)');
    expect(html).toContain('visitReport.thinksWorse(onboarding.hunchscreens)');
    expect(html).not.toContain('hunchDontKnow');
  });

  it('leaves both out when nothing was answered', () => {
    const html = buildVisitReportHtml({
      ...base,
      checkins: [],
      diagnosis: null,
      aboutMe: { workType: null, workHours: null, lifeStress: null, suspectedTriggers: [] },
    });
    expect(html).not.toContain('visitReport.diagnosis');
    expect(html).not.toContain('visitReport.aboutMe');
  });

  it('adds "since you started" once there are 21 logged days', () => {
    const checkins = Array.from({ length: 21 }, (_, i) =>
      checkin(format(addDays(parseISO('2026-09-01'), i), 'yyyy-MM-dd'), 'evening', i < 7 ? 6 : 3),
    );
    expect(buildVisitReportHtml({ ...base, checkins })).toContain('visitReport.sinceStart(');
    expect(buildVisitReportHtml({ ...base, checkins: checkins.slice(0, 20) })).not.toContain('visitReport.sinceStart(');
  });
});

describe('painChartSvg', () => {
  it('breaks the line on days without a check-in and marks flare-ups', () => {
    const averages = new Map([
      ['2026-10-01', 4],
      ['2026-10-02', 5],
      ['2026-10-04', 3],
    ]);
    const svg = painChartSvg(averages, { from: '2026-10-01', to: '2026-10-05' }, ['2026-10-02'], {
      from: 'a',
      to: 'b',
    });
    expect(svg.match(/<polyline/g)).toHaveLength(1);
    expect(svg.match(/<circle/g)).toHaveLength(2); // the lone 4 Oct point + one flare-up
  });
});

describe('escapeHtml', () => {
  it('escapes markup characters', () => {
    expect(escapeHtml(`<a href="x">'&'</a>`)).toBe('&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;');
  });
});
