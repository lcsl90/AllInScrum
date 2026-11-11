import { COFFEE_CARD } from '@allinscrum/protocol';
import { describe, expect, it } from 'vitest';
import { DEFAULT_DECK } from './deck.ts';
import { summarizeRound } from './round-result.ts';

/** Jede Karte stammt von einem eigenen Spieler: p1, p2, … */
function votesOf(cards: readonly string[]): Map<string, string> {
  return new Map(cards.map((card, index) => [`p${index + 1}`, card]));
}

describe('summarizeRound', () => {
  describe('Durchschnitt', () => {
    it.each([
      [['5', '8', '8'], 7],
      [['5', '8'], 6.5],
      [['1', '2', '3', '5'], 2.75],
    ])('ist der echte Mittelwert der Zahlenkarten %j: %s', (cards, average) => {
      expect(summarizeRound(votesOf(cards), DEFAULT_DECK).average).toBe(average);
    });

    it('lässt Sonderkarten außen vor', () => {
      expect(summarizeRound(votesOf(['3', '?', COFFEE_CARD, '5']), DEFAULT_DECK).average).toBe(4);
    });

    it('gibt es ohne Zahlenkarten nicht', () => {
      expect(summarizeRound(votesOf(['?', COFFEE_CARD]), DEFAULT_DECK).average).toBeNull();
    });
  });

  describe('Kartenvorschlag', () => {
    it.each([
      [['5', '5', '8'], '5'],
      [['3', '5', '8'], '5'],
      [['5', '8', '8'], '8'],
      [['8', '13', '13'], '13'],
      [['1', '1', '2'], '1'],
    ])(
      'schlägt für %j die Karte des Decks vor, die dem Mittelwert am nächsten liegt: %s',
      (cards, card) => {
        expect(summarizeRound(votesOf(cards), DEFAULT_DECK).suggestedCard).toBe(card);
      },
    );

    it.each([
      [['5', '8'], '8'],
      [['1', '2'], '2'],
    ])('nimmt bei Gleichstand (%j) die größere Karte: %s', (cards, card) => {
      expect(summarizeRound(votesOf(cards), DEFAULT_DECK).suggestedCard).toBe(card);
    });

    it('gibt es ohne Zahlenkarten nicht', () => {
      expect(summarizeRound(votesOf(['?', COFFEE_CARD]), DEFAULT_DECK).suggestedCard).toBeNull();
    });

    it('gibt es nicht bei einem Deck ohne Zahlen', () => {
      expect(summarizeRound(votesOf(['S', 'M']), ['S', 'M', 'L']).suggestedCard).toBeNull();
    });
  });

  it.each([
    { cards: ['5', '5', '5'], consensus: true },
    { cards: ['5', '5', '8'], consensus: false },
    { cards: ['5'], consensus: false },
  ])('erkennt Konsens bei $cards → $consensus', ({ cards, consensus }) => {
    expect(summarizeRound(votesOf(cards), DEFAULT_DECK).consensus).toBe(consensus);
  });

  describe('Ausreißer', () => {
    it('benennt die niedrigste und die höchste Schätzung samt allen, die sie gelegt haben', () => {
      const result = summarizeRound(votesOf(['3', '5', '13', '3']), DEFAULT_DECK);

      expect(result.outliers).toEqual({
        lowest: { card: '3', playerIds: ['p1', 'p4'] },
        highest: { card: '13', playerIds: ['p3'] },
      });
    });

    it('vergleicht Zahlen nach ihrem Wert, nicht alphabetisch', () => {
      const result = summarizeRound(votesOf(['13', '2']), DEFAULT_DECK);

      expect(result.outliers).toMatchObject({ lowest: { card: '2' }, highest: { card: '13' } });
    });

    it('ordnet Karten ohne Zahl wie T-Shirt-Größen nach ihrer Reihenfolge im Deck', () => {
      const result = summarizeRound(votesOf(['L', 'S', 'M']), ['S', 'M', 'L', '?']);

      expect(result.outliers).toMatchObject({ lowest: { card: 'S' }, highest: { card: 'L' } });
    });

    it('lässt Signalkarten außen vor', () => {
      const result = summarizeRound(votesOf(['?', '8', COFFEE_CARD, '3']), DEFAULT_DECK);

      expect(result.outliers).toEqual({
        lowest: { card: '3', playerIds: ['p4'] },
        highest: { card: '8', playerIds: ['p2'] },
      });
    });

    it.each([[['5', '5']], [['5', '?']], [['5']], [['?', COFFEE_CARD]]])(
      'gibt es nicht ohne zwei verschiedene Schätzungen: %j',
      (cards) => {
        expect(summarizeRound(votesOf(cards), DEFAULT_DECK).outliers).toBeNull();
      },
    );
  });
});
