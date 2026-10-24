import { describe, expect, it } from 'vitest';
import { diagnose, parseDecimal } from '../src/diagnose';

describe('espresso diagnosis', () => {
  it.each([
    [18.0, 28, 'dose-high'], [15.5, 18, 'dose-low'], [16.0, 18, 'fast'],
    [16.0, 29, 'slow'], [16.0, 23, 'ok'], [15.8, 20, 'ok'], [16.2, 25, 'ok'],
    [15.79, 23, 'dose-low'], [16.21, 23, 'dose-high'],
  ] as const)('dose %s, time %s -> %s', (dose, time, kind) => {
    expect(diagnose(dose, time).kind).toBe(kind);
  });
  it('prioritizes dose over shot time', () => {
    expect(diagnose(18, 18).kind).toBe('dose-high');
    expect(diagnose(15.5, 29).kind).toBe('dose-low');
  });
});

describe('decimal input validation', () => {
  it.each([['16,0', 16], ['16.0', 16], ['.5', 0.5], [',5', 0.5], [' 23 ', 23]])('parses %s', (raw, expected) => expect(parseDecimal(raw)).toBe(expected));
  it.each(['', ' ', '-1', 'abc', '12abc', '1,2,3', 'Infinity', '1e2'])('rejects %s', raw => expect(parseDecimal(raw)).toBeNull());
});
