jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import { flarePatternSentence } from './flareDetectiveText';
import { translate } from './i18n/useTranslation';

const en = (key: string, vars?: Record<string, string | number>) => translate('en', key, vars);
const lt = (key: string, vars?: Record<string, string | number>) => translate('lt', key, vars);

describe('flarePatternSentence', () => {
  it('says "all" when the factor came before every flare-up', () => {
    expect(flarePatternSentence(en, 'en', 3, 3, 'you slept less')).toBe('Before all 3 of your flare-ups, you slept less.');
    expect(flarePatternSentence(lt, 'lt', 3, 3, 'miegojote mažiau')).toBe('Prieš visus 3 paūmėjimus miegojote mažiau.');
  });

  it('keeps "N of your M" otherwise', () => {
    expect(flarePatternSentence(en, 'en', 2, 3, 'you slept less')).toBe('Before 2 of your 3 flare-ups, you slept less.');
  });
});
