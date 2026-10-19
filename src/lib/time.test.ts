import { clampTime, dateToTime, hourToTime, timeToDate } from './time';

describe('time helpers', () => {
  it('round-trips HH:mm through a Date', () => {
    expect(dateToTime(timeToDate('08:05'))).toBe('08:05');
    expect(dateToTime(timeToDate('21:30'))).toBe('21:30');
  });

  it('formats whole hours', () => {
    expect(hourToTime(16)).toBe('16:00');
    expect(hourToTime(7)).toBe('07:00');
  });

  it('clamps into the allowed window', () => {
    expect(clampTime('14:30', '16:00')).toBe('16:00');
    expect(clampTime('21:00', '16:00')).toBe('21:00');
    expect(clampTime('17:00', undefined, '15:59')).toBe('15:59');
    expect(clampTime('08:00', undefined, '15:59')).toBe('08:00');
  });
});
