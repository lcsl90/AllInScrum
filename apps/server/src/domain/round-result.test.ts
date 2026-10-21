import { COFFEE_CARD } from '@allinscrum/protocol';
import { describe, expect, it } from 'vitest';
import { DEFAULT_DECK } from './deck.ts';
import { summarizeRound } from './round-result.ts';

describe('summarizeRound', () => {
  describe('Durchschnitt', () => {
    it.each([
      [['5', '8', '8'], 7],
      [['5', '8'], 6.5],
      [['1', '2', '3', '5'], 2.75],
    ])('ist der echte Mittelwert der Zahlenkarten %j: %s', (cards, average) => {
      expect(summarizeRound(cards, DEFAULT_DECK).average).toBe(average);
    });

    it('lässt Sonderkarten außen vor', () => {
      expect(summarizeRound(['3', '?', COFFEE_CARD, '5'], DEFAULT_DECK).average).toBe(4);
    });

    it('gibt es ohne Zahlenkarten nicht', () => {
      expect(summarizeRound(['?', COFFEE_CARD], DEFAULT_DECK).average).toBeNull();
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
        expect(summarizeRound(cards, DEFAULT_DECK).suggestedCard).toBe(card);
      },
    );

    it.each([
      [['5', '8'], '8'],
      [['1', '2'], '2'],
    ])('nimmt bei Gleichstand (%j) die größere Karte: %s', (cards, card) => {
      expect(summarizeRound(cards, DEFAULT_DECK).suggestedCard).toBe(card);
    });

    it('gibt es ohne Zahlenkarten nicht', () => {
      expect(summarizeRound(['?', COFFEE_CARD], DEFAULT_DECK).suggestedCard).toBeNull();
    });

    it('gibt es nicht bei einem Deck ohne Zahlen', () => {
      expect(summarizeRound(['S', 'M'], ['S', 'M', 'L']).suggestedCard).toBeNull();
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
