import { supabase } from '@/lib/supabase';

import { requestRoutineDraft } from './useGenerateRoutine';

// requestRoutineDraft → t() / useLocaleStore, which persists via AsyncStorage.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('@/lib/supabase', () => ({
  supabase: { functions: { invoke: jest.fn() } },
}));

const invoke = supabase.functions.invoke as jest.Mock;

describe('requestRoutineDraft with photos', () => {
  afterEach(() => jest.clearAllMocks());

  it('sends the photos as the images source and returns the draft', async () => {
    invoke.mockResolvedValue({
      data: {
        routine_title: 'Neck routine',
        summary: 'From your sheet.',
        exercises: [
          {
            id: 'ex_1',
            name: 'Chin tuck',
            muscle_group: 'Neck',
            target_sets_reps: '3 x 10',
            instructions: 'Slowly.',
            caution_notes: 'Stop if it hurts.',
          },
        ],
      },
      error: null,
    });

    const outcome = await requestRoutineDraft({ source: 'images', images: ['abc123'] }, 'en');

    expect(invoke).toHaveBeenCalledWith('generate-routine', {
      body: { source: 'images', images: ['abc123'], locale: 'en' },
    });
    expect(outcome.error).toBeNull();
    expect(outcome.draft?.exercises).toHaveLength(1);
  });

  it('turns "no exercises found" into a readable message instead of a draft', async () => {
    invoke.mockResolvedValue({
      data: { error_code: 'no_exercises_found', error: 'No exercises were found in the photos.' },
      error: null,
    });

    const outcome = await requestRoutineDraft({ source: 'images', images: ['abc123'] }, 'en');

    expect(outcome.draft).toBeNull();
    expect(outcome.error).toBe(
      "Couldn't find exercises in these photos. Try a clearer photo, or describe them in text.",
    );
  });
});
