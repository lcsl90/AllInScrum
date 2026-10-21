import { describe, expect, it } from 'vitest';
import { DEFAULT_DECK } from './deck.ts';
import { summarizeRound } from './round-result.ts';

describe('summarizeRound', () => {
  describe('Durchschnitt', () => {
    it.each([
      [['5', '5', '8'], '5'],
      [['3', '5', '8'], '5'],
      [['8', '13', '13'], '13'],
      [['1', '1', '2'], '1'],
    ])('rundet den Mittelwert von %j auf die nächste Karte im Deck: %s', (cards, average) => {
      expect(summarizeRound(cards, DEFAULT_DECK).average).toBe(average);
    });

    it.each([
      [['5', '8'], '8'],
      [['1', '2'], '2'],
    ])('nimmt bei Gleichstand (%j) die größere Karte: %s', (cards, average) => {
      expect(summarizeRound(cards, DEFAULT_DECK).average).toBe(average);
    });

    it('lässt Sonderkarten außen vor', () => {
      expect(summarizeRound(['3', '?', '☕', '3'], DEFAULT_DECK).average).toBe('3');
    });

    it('gibt es ohne Zahlenkarten nicht', () => {
      expect(summarizeRound(['?', '☕'], DEFAULT_DECK).average).toBeNull();
    });

    it('gibt es nicht bei einem Deck ohne Zahlen', () => {
      expect(summarizeRound(['S', 'M'], ['S', 'M', 'L']).average).toBeNull();
    });
  });

  it.each([
    { cards: ['5', '5', '5'], consensus: true },
    { cards: ['5', '5', '8'], consensus: false },
    { cards: ['5'], consensus: false },
  ])('erkennt Konsens bei $cards → $consensus', ({ cards, consensus }) => {
    expect(summarizeRound(cards, DEFAULT_DECK).consensus).toBe(consensus);
  });
});
