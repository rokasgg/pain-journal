import type { FlareUp } from '@/types/database.types';

import { buildCalendarMarkers } from './historyEntries';

// historyEntries → lib/dates → useLocaleStore, which persists via AsyncStorage.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

function flareUpAt(occurred_at: string): FlareUp {
  return {
    id: 'f1',
    user_id: 'u1',
    occurred_at,
    pain_level: 7,
    likely_cause: null,
    description: null,
    status: 'resolved',
    status_updated_at: occurred_at,
    resolved_duration_minutes: null,
    resolution_note: null,
    created_at: occurred_at,
  };
}

describe('buildCalendarMarkers', () => {
  it('marks a just-after-midnight flare-up on its local day, not the UTC day', () => {
    // 00:30 local on Oct 17 — in any UTC+ timezone (e.g. Lithuania) this is
    // still Oct 16 in UTC, which is where `.slice(0, 10)` used to put it.
    const occurredAt = new Date(2026, 9, 17, 0, 30).toISOString();

    const markers = buildCalendarMarkers([], [flareUpAt(occurredAt)]);

    expect(markers['2026-10-17']?.hasFlareUp).toBe(true);
    expect(markers['2026-10-16']).toBeUndefined();
  });
});
