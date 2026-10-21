import { describe, expect, it } from 'vitest';
import { generateJoinCode, normalizeJoinCode } from './join-code.ts';

describe('Join-Code', () => {
  it('besteht aus zweimal drei gut abtippbaren Zeichen', () => {
    const codes = Array.from({ length: 200 }, generateJoinCode);

    // Kein 0/O, 1/I/L – Verwechslungsgefahr beim Abtippen oder Vorlesen.
    codes.forEach((code) => expect(code).toMatch(/^[A-HJKMNP-Z2-9]{3}-[A-HJKMNP-Z2-9]{3}$/));
    expect(new Set(codes).size).toBeGreaterThan(195);
  });

  it.each([
    ['K7Q-X2M', 'K7Q-X2M'],
    ['k7q-x2m', 'K7Q-X2M'],
    [' k7q x2m ', 'K7Q-X2M'],
    ['K7QX2M', 'K7Q-X2M'],
  ])('versteht die Eingabe "%s" als %s', (input, expected) => {
    expect(normalizeJoinCode(input)).toBe(expected);
  });

  it.each(['K7Q-X2', 'K7Q-X2MM', '', 'K7Q_X2M!'])('erkennt "%s" als ungültig', (input) => {
    expect(normalizeJoinCode(input)).toBeNull();
  });
});
