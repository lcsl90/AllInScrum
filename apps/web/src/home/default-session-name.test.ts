import { describe, expect, it } from 'vitest';
import { defaultSessionName } from './default-session-name.ts';

describe('defaultSessionName', () => {
  it.each([
    ['Alice', 'Alices Runde'],
    ['Klaus', "Klaus' Runde"],
    ['Max', "Max' Runde"],
    ['Fritz', "Fritz' Runde"],
    ['Strauß', "Strauß' Runde"],
    ['  Bob ', 'Bobs Runde'],
  ])('macht aus "%s" den Vorschlag "%s"', (name, expected) => {
    expect(defaultSessionName(name)).toBe(expected);
  });
});
