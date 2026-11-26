jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import { interpolate, translate } from './useTranslation';

describe('interpolate', () => {
  it('replaces every occurrence of a placeholder', () => {
    expect(interpolate('first {{count}} vs latest {{count}}', { count: 14 })).toBe('first 14 vs latest 14');
  });

  it('leaves strings without vars alone', () => {
    expect(interpolate('Tools')).toBe('Tools');
  });
});

describe('translate', () => {
  it('fills a repeated placeholder in real copy', () => {
    const text = translate('en', 'insights.found.progressDetail', { count: 7 });
    expect(text).toBe('your first 7 logged days vs your latest 7');
    expect(translate('lt', 'insights.found.progressDetail', { count: 7 })).not.toContain('{{');
  });
});
