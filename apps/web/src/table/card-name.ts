import { type Card, COFFEE_CARD } from '@allinscrum/protocol';

/** Wie eine Karte heißt – Symbolkarten bekommen für Screenreader ein Wort statt ihres Kennworts. */
export function cardName(card: Card): string {
  return card === COFFEE_CARD ? 'Kaffeepause' : card;
}
