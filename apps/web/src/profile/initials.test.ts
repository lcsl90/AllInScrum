import { describe, expect, it } from 'vitest';
import { initialsOf } from './initials.ts';

describe('initialsOf', () => {
  it.each([
    ['Alice', 'A'],
    ['alice bob', 'AB'],
    ['Anna Maria Schmidt', 'AS'],
    ['  Bob  ', 'B'],
    ['Élodie Ünal', 'ÉÜ'],
    ['', '?'],
  ])('macht aus "%s" die Initialen "%s"', (name, initials) => {
    expect(initialsOf(name)).toBe(initials);
  });
});
