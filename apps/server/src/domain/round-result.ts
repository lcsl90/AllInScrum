import type { Card, Estimate, Outliers, RoundResult } from '@allinscrum/protocol';
import { SIGNAL_CARDS } from './deck.ts';

/** Wertet die aufgedeckten Karten einer Runde aus – je Spieler-ID die gelegte Karte. */
export function summarizeRound(
  votes: ReadonlyMap<string, Card>,
  deck: readonly Card[],
): RoundResult {
  const cards = [...votes.values()];
  const mean = meanOf(cards.map(numericValue).filter((value) => value !== null));
  return {
    average: mean,
    suggestedCard: mean === null ? null : nearestCard(mean, deck),
    consensus: cards.length >= 2 && new Set(cards).size === 1,
    outliers: outliersOf(votes, deck),
  };
}

/**
 * Die äußeren Schätzungen einer Runde. Die Skala ist die Reihenfolge im Deck – so funktioniert
 * das auch für T-Shirt-Größen. Signalkarten wie "?" haben keinen Platz auf der Skala.
 */
function outliersOf(votes: ReadonlyMap<string, Card>, deck: readonly Card[]): Outliers | null {
  const onScale = estimatesByCard(votes)
    .filter((estimate) => !SIGNAL_CARDS.includes(estimate.card))
    .sort((a, b) => deck.indexOf(a.card) - deck.indexOf(b.card));
  const lowest = onScale.at(0);
  const highest = onScale.at(-1);
  if (!lowest || !highest || lowest === highest) return null;
  return { lowest, highest };
}

function estimatesByCard(votes: ReadonlyMap<string, Card>): Estimate[] {
  const playersByCard = new Map<Card, string[]>();
  votes.forEach((card, playerId) => {
    const playerIds = playersByCard.get(card) ?? [];
    playerIds.push(playerId);
    playersByCard.set(card, playerIds);
  });
  return [...playersByCard].map(([card, playerIds]) => ({ card, playerIds }));
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
