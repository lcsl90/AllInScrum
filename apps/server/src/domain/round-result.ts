import type { Card, RoundResult } from '@allinscrum/protocol';

/** Wertet die aufgedeckten Karten einer Runde aus. */
export function summarizeRound(cards: readonly Card[], deck: readonly Card[]): RoundResult {
  const mean = meanOf(cards.map(numericValue).filter((value) => value !== null));
  return {
    average: mean,
    suggestedCard: mean === null ? null : nearestCard(mean, deck),
    consensus: cards.length >= 2 && new Set(cards).size === 1,
  };
}

/**
 * Der Vorschlag ist immer eine Karte aus dem Deck – bei Fibonacci gibt es keine 6.
 * Bei Gleichstand gewinnt die größere Karte: Lieber vorsichtig schätzen.
 */
function nearestCard(mean: number, deck: readonly Card[]): Card | null {
  let nearest: { card: Card; distance: number } | null = null;
  for (const card of deck) {
    const value = numericValue(card);
    if (value === null) continue;
    const distance = Math.abs(value - mean);
    if (nearest === null || distance <= nearest.distance) nearest = { card, distance };
  }
  return nearest?.card ?? null;
}

/** Zahlenkarten liefern ihren Wert, Sonderkarten wie "?" oder die Kaffeekarte liefern null. */
function numericValue(card: Card): number | null {
  const value = Number(card);
  return card.trim() !== '' && Number.isFinite(value) ? value : null;
}

function meanOf(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((total, value) => total + value, 0) / values.length;
}
