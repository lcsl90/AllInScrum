import type { Card, Estimate, PlayerView, RoundResult } from '@allinscrum/protocol';

/** Eine Schätzung und die Spieler, die sie vor dem Team begründen. */
export interface Voice {
  readonly card: Card;
  readonly players: readonly PlayerView[];
}

/**
 * agreed: Einigkeit – weiter zur nächsten Story · discuss: Die Ränder begründen, dann neu schätzen ·
 * clarify: Fragezeichen oder Kaffeetasse – erst klären, dann schätzen
 */
export type MentorAdvice =
  | { readonly kind: 'agreed' }
  | { readonly kind: 'discuss'; readonly lowest: Voice; readonly highest: Voice }
  | { readonly kind: 'clarify' };

/**
 * Was das Team nach dem Aufdecken tun sollte. Die Auswertung kommt vom Server – hier wird sie nur
 * in einen Rat übersetzt. null, wenn es nichts zu besprechen gibt (etwa bei nur einer Karte).
 */
export function mentorAdvice(
  result: RoundResult,
  players: readonly PlayerView[],
): MentorAdvice | null {
  if (result.consensus) return { kind: 'agreed' };
  if (result.outliers) {
    return {
      kind: 'discuss',
      lowest: voiceOf(result.outliers.lowest, players),
      highest: voiceOf(result.outliers.highest, players),
    };
  }
  const cardsOnTable = players.filter((player) => player.status === 'voted').length;
  return cardsOnTable >= 2 ? { kind: 'clarify' } : null;
}

function voiceOf(estimate: Estimate, players: readonly PlayerView[]): Voice {
  return {
    card: estimate.card,
    players: players.filter((player) => estimate.playerIds.includes(player.id)),
  };
}
