import { type Card, COFFEE_CARD } from '@allinscrum/protocol';

/** "Keine Ahnung" – die Story ist unklar. */
export const UNKNOWN_CARD: Card = '?';

/** Fibonacci-Karten plus "?" (keine Ahnung) und die Kaffeekarte (Pause). */
export const DEFAULT_DECK: readonly Card[] = [
  '0',
  '1',
  '2',
  '3',
  '5',
  '8',
  '13',
  '21',
  '34',
  UNKNOWN_CARD,
  COFFEE_CARD,
];

/**
 * Karten ohne Schätzwert, die etwas signalisieren: Klärungsbedarf oder Pausenwunsch. Sie verraten
 * keine Zahl, an der sich andere orientieren könnten – deshalb liegen sie sofort offen, und das
 * Team kann reagieren, ohne die Runde erst zu Ende zu spielen.
 */
export const SIGNAL_CARDS: readonly Card[] = [UNKNOWN_CARD, COFFEE_CARD];
