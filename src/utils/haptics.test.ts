import * as Haptics from 'expo-haptics';

import { useHapticsStore } from '@/store/useHapticsStore';

import { haptics } from './haptics';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn(() => Promise.resolve()),
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Soft: 'soft' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

describe('haptics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useHapticsStore.setState({ enabled: true });
  });

  it('maps each meaning to one expo-haptics call', () => {
    haptics.tick();
    haptics.tap();
    haptics.press();
    haptics.success();
    haptics.warning();
    haptics.error();

    expect(Haptics.selectionAsync).toHaveBeenCalledTimes(1);
    expect(Haptics.impactAsync).toHaveBeenNthCalledWith(1, 'light');
    expect(Haptics.impactAsync).toHaveBeenNthCalledWith(2, 'medium');
    expect(Haptics.notificationAsync).toHaveBeenNthCalledWith(1, 'success');
    expect(Haptics.notificationAsync).toHaveBeenNthCalledWith(2, 'warning');
    expect(Haptics.notificationAsync).toHaveBeenNthCalledWith(3, 'error');
  });

  it('plays three soft droplets in sequence', () => {
    jest.useFakeTimers();
    haptics.droplets();
    jest.runAllTimers();
    expect(Haptics.impactAsync).toHaveBeenCalledTimes(3);
    expect(Haptics.impactAsync).toHaveBeenCalledWith('soft');
    jest.useRealTimers();
  });

  it('does nothing when vibration is turned off', () => {
    jest.useFakeTimers();
    useHapticsStore.setState({ enabled: false });
    haptics.tick();
    haptics.success();
    haptics.droplets();
    jest.runAllTimers();
    expect(Haptics.selectionAsync).not.toHaveBeenCalled();
    expect(Haptics.notificationAsync).not.toHaveBeenCalled();
    expect(Haptics.impactAsync).not.toHaveBeenCalled();
    jest.useRealTimers();
  });

  it('swallows native failures', () => {
    (Haptics.selectionAsync as jest.Mock).mockReturnValueOnce(Promise.reject(new Error('no haptics engine')));
    expect(() => haptics.tick()).not.toThrow();
  });
});
