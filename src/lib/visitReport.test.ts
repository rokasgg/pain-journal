import { buildVisitReportHtml, escapeHtml, visitReportPeriod } from '@/lib/visitReport';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const TODAY = '2026-10-27';
const t = (key: string, vars?: Record<string, string | number>) =>
  vars ? `${key}(${Object.values(vars).join(',')})` : key;

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
      { checkin_date: '2026-10-12', type: 'morning', pain_level: 9, notes: 'before the period' },
      { checkin_date: '2026-10-14', type: 'morning', pain_level: 6, notes: 'Stiff <neck> & shoulders' },
      { checkin_date: '2026-10-14', type: 'evening', pain_level: 2, notes: null },
      { checkin_date: '2026-10-15', type: 'evening', pain_level: 0, notes: '  ' },
    ],
    flareUps: [
      { occurred_at: '2026-10-20T08:30:00', pain_level: 8, likely_cause: 'Lifting', description: null },
      { occurred_at: '2026-10-01T08:30:00', pain_level: 7, likely_cause: 'old', description: null },
    ],
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
});

describe('escapeHtml', () => {
  it('escapes markup characters', () => {
    expect(escapeHtml(`<a href="x">'&'</a>`)).toBe('&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;');
  });
});
