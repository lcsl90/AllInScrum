import type { Card, PlayerView } from '@allinscrum/protocol';

export interface CardStack {
  readonly card: Card;
  /** Wer diese Karte gelegt hat – in Sitzreihenfolge. */
  readonly players: readonly PlayerView[];
}

/** Gruppiert die aufgedeckten Karten nach Wert, in der Reihenfolge des Decks. */
export function cardStacks(players: readonly PlayerView[], deck: readonly Card[]): CardStack[] {
  return deck
    .map((card) => ({
      card,
      players: players.filter((player) => player.status === 'voted' && player.card === card),
    }))
    .filter((stack) => stack.players.length > 0);
}
