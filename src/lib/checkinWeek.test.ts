import { buildCheckinWeek } from './checkinWeek';

const TODAY = '2026-10-19'; // a Monday

describe('buildCheckinWeek', () => {
  it('spans Monday to Sunday and flags today and future days', () => {
    const week = buildCheckinWeek([], '2026-10-21'); // Wednesday
    expect(week.days.map((d) => d.date)).toEqual([
      '2026-10-19',
      '2026-10-20',
      '2026-10-21',
      '2026-10-22',
      '2026-10-23',
      '2026-10-24',
      '2026-10-25',
    ]);
    expect(week.days[2].isToday).toBe(true);
    expect(week.days[1].isFuture).toBe(false);
    expect(week.days[3].isFuture).toBe(true);
  });

  it('marks morning and evening separately and counts out of 14', () => {
    const week = buildCheckinWeek(
      [
        { checkin_date: '2026-10-19', type: 'morning' },
        { checkin_date: '2026-10-19', type: 'evening' },
        { checkin_date: '2026-10-18', type: 'morning' }, // last week — ignored
      ],
      TODAY,
    );
    expect(week.days[0]).toMatchObject({ morning: true, evening: true, isToday: true });
    expect(week.logged).toBe(2);
    expect(week.total).toBe(14);
  });
});
