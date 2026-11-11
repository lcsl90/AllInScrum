import { type Card, COFFEE_CARD, UNKNOWN_CARD } from '@allinscrum/protocol';

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
