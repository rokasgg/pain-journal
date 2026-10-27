jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

import { buildComparisons, comparisonsForModel, parseChatReply, replyAsText } from '@/lib/chatReply';

const TODAY = '2026-10-27';

describe('parseChatReply', () => {
  it('parses an answer and drops unknown comparisons and extra follow-ups', () => {
    expect(
      parseChatReply({
        kind: 'answer',
        lead: ' Yes, it seems so. ',
        body: 'Mornings after poor nights were worse.',
        comparison: 'made_up',
        caveat: '',
        follow_ups: ['A?', '', 'B?', 'C?'],
      }),
    ).toEqual({
      kind: 'answer',
      lead: 'Yes, it seems so.',
      body: 'Mornings after poor nights were worse.',
      comparison: null,
      caveat: '',
      followUps: ['A?', 'B?'],
    });
  });

  it('keeps a known comparison', () => {
    const reply = parseChatReply({ kind: 'answer', lead: '', body: 'x', comparison: 'morning_vs_evening' });
    expect(reply).toMatchObject({ comparison: 'morning_vs_evening', followUps: [] });
  });

  it('parses a red flag', () => {
    expect(parseChatReply({ kind: 'red_flag', red_flag_message: 'See a doctor.' })).toEqual({
      kind: 'red_flag',
      message: 'See a doctor.',
    });
  });

  it('rejects malformed replies', () => {
    expect(parseChatReply(null)).toBeNull();
    expect(parseChatReply('text')).toBeNull();
    expect(parseChatReply({ kind: 'answer', lead: '', body: '' })).toBeNull();
    expect(parseChatReply({ kind: 'red_flag', red_flag_message: '' })).toBeNull();
    expect(parseChatReply({ kind: 'other', body: 'x' })).toBeNull();
  });
});

describe('replyAsText', () => {
  it('joins the visible parts', () => {
    expect(
      replyAsText({ kind: 'answer', lead: 'Yes.', body: 'Body.', comparison: null, caveat: 'Caveat.', followUps: [] }),
    ).toBe('Yes. Body. Caveat.');
    expect(replyAsText({ kind: 'red_flag', message: 'Call.' })).toBe('Call.');
  });
});

describe('buildComparisons', () => {
  const morning = (date: string, pain: number, quality: number) => ({
    checkin_date: date,
    type: 'morning' as const,
    pain_level: pain,
    sleep_quality: quality,
    sleep_hours: null,
  });

  it('builds the sleep comparison over the chosen period only', () => {
    const checkins = [
      morning('2026-10-26', 6, 3),
      morning('2026-10-25', 4, 2),
      morning('2026-10-24', 2, 8),
      morning('2026-10-23', 2, 9),
      // outside a 7-day period
      morning('2026-10-01', 10, 1),
    ];
    const week = buildComparisons(checkins, [], TODAY, 7);
    expect(week.sleep_vs_morning_pain?.rows.map((r) => r.value)).toEqual([5, 2]);
    expect(week.sleep_vs_morning_pain?.entries).toBe(4);
    expect(week.morning_vs_evening).toBeUndefined();

    const month = buildComparisons(checkins, [], TODAY, 30);
    expect(month.sleep_vs_morning_pain?.rows[0].value).toBeCloseTo(20 / 3);
  });

  it('rounds values for the model', () => {
    const cards = buildComparisons(
      [morning('2026-10-26', 5, 3), morning('2026-10-25', 6, 2), morning('2026-10-24', 3, 8), morning('2026-10-23', 3, 9)],
      [],
      TODAY,
      30,
    );
    expect(comparisonsForModel(cards).sleep_vs_morning_pain).toEqual({
      avg_morning_pain_after_poor_sleep: 5.5,
      avg_morning_pain_after_good_sleep: 3,
      mornings: 4,
    });
    expect(comparisonsForModel(cards).training_vs_rest).toBeUndefined();
  });
});
