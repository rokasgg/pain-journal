import { overdueNextVisit } from '@/lib/physioVisits';

const TODAY = '2026-10-27';

describe('overdueNextVisit', () => {
  it('returns the planned date once it has passed', () => {
    expect(overdueNextVisit({ visit_date: '2026-10-13', next_visit_date: '2026-10-21' }, TODAY)).toBe('2026-10-21');
  });

  it('null when today, upcoming, unset, nonsensical or no visits', () => {
    expect(overdueNextVisit({ visit_date: '2026-10-13', next_visit_date: TODAY }, TODAY)).toBeNull();
    expect(overdueNextVisit({ visit_date: '2026-10-13', next_visit_date: '2026-11-02' }, TODAY)).toBeNull();
    expect(overdueNextVisit({ visit_date: '2026-10-13', next_visit_date: null }, TODAY)).toBeNull();
    expect(overdueNextVisit({ visit_date: '2026-10-13', next_visit_date: '2026-10-10' }, TODAY)).toBeNull();
    expect(overdueNextVisit(null, TODAY)).toBeNull();
  });
});
