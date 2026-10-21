import { randomInt } from 'node:crypto';

/**
 * Der Join-Code ist Schlüssel und Adresse einer Session zugleich: Wer ihn kennt, kommt an den Tisch.
 * 31⁶ ≈ 887 Mio. Kombinationen – ohne 0/O und 1/I/L, damit man ihn gut vorlesen und abtippen kann.
 */
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const GROUP_LENGTH = 3;
const VALID_CODE = new RegExp(`^[${ALPHABET}]{${GROUP_LENGTH * 2}}$`);

export function generateJoinCode(): string {
  const characters = Array.from(
    { length: GROUP_LENGTH * 2 },
    () => ALPHABET[randomInt(ALPHABET.length)],
  );
  return format(characters.join(''));
}

/**
 * Macht aus einer Nutzereingabe die kanonische Schreibweise "K7Q-X2M".
 * @returns null, wenn die Eingabe kein gültiger Code sein kann.
 */
export function normalizeJoinCode(input: string): string | null {
  const compact = input.replace(/[\s-]/g, '').toUpperCase();
  return VALID_CODE.test(compact) ? format(compact) : null;
}

function format(compact: string): string {
  return `${compact.slice(0, GROUP_LENGTH)}-${compact.slice(GROUP_LENGTH)}`;
}
