import { describe, expect, it } from 'vitest';
import { fitAvatar, type ImageEncoder } from './avatar-fitting.ts';

/** Fake-Encoder: Die "Dateigröße" wächst mit Kantenlänge und Qualität. */
const encoder: ImageEncoder = (size, quality) =>
  `${size}@${quality}:`.padEnd(size * size * quality * 0.5, 'x');

describe('fitAvatar', () => {
  it('nimmt die größte, schönste Variante, wenn sie ins Budget passt', () => {
    expect(fitAvatar(encoder, 100_000)).toMatch(/^128@0.85:/);
  });

  it('senkt zuerst die Qualität, bevor das Bild kleiner wird', () => {
    const budget = 128 * 128 * 0.55 * 0.5;

    expect(fitAvatar(encoder, budget)).toMatch(/^128@0.55:/);
  });

  it('verkleinert das Bild, wenn die Qualität allein nicht reicht', () => {
    const budget = 96 * 96 * 0.85 * 0.5;

    expect(fitAvatar(encoder, budget)).toMatch(/^96@0.85:/);
  });

  it('gibt auf, wenn selbst die kleinste Variante zu groß ist', () => {
    expect(fitAvatar(encoder, 10)).toBeNull();
  });
});
