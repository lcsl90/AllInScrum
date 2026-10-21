import { describe, expect, it } from 'vitest';
import { formatJoinCodeInput, isCompleteJoinCode } from './join-code-input.ts';

describe('Eingabe des Join-Codes', () => {
  it.each([
    ['k', 'K'],
    ['k7q', 'K7Q'],
    ['k7qx', 'K7Q-X'],
    ['K7Q-X2M', 'K7Q-X2M'],
    ['k7q x2m', 'K7Q-X2M'],
    ['K7QX2M99', 'K7Q-X2M'],
    ['k7q-', 'K7Q'],
  ])('formatiert "%s" beim Tippen zu "%s"', (typed, shown) => {
    expect(formatJoinCodeInput(typed)).toBe(shown);
  });

  it.each([
    ['K7Q-X2M', true],
    ['K7Q-X2', false],
    ['', false],
  ])('erkennt "%s" als vollständig: %s', (code, complete) => {
    expect(isCompleteJoinCode(code)).toBe(complete);
  });
});
