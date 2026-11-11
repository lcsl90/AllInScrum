import {
  COFFEE_CARD,
  type PlayerView,
  type RoundRecord,
  type RoundResult,
  type SessionView,
} from '@allinscrum/protocol';

export const DECK = ['0', '1', '2', '3', '5', '8', '13', '21', '34', '?', COFFEE_CARD];

export function buildPlayer(overrides: Partial<PlayerView> & Pick<PlayerView, 'id'>): PlayerView {
  return {
    name: overrides.id[0]!.toUpperCase() + overrides.id.slice(1),
    avatar: null,
    isAdmin: false,
    isOnline: true,
    isSpectator: false,
    status: 'pending',
    uncertain: false,
    card: null,
    cardOpen: false,
    replacedCard: null,
    ...overrides,
  };
}

/** Ein Tisch mit "me" (Alice, Admin) und "bob" – per Overrides beliebig anpassbar. */
export function buildView(overrides: Partial<SessionView> = {}): SessionView {
  return {
    joinCode: 'K7Q-X2M',
    name: 'Sprint 42',
    deck: DECK,
    phase: 'lobby',
    round: 0,
    youId: 'me',
    players: [buildPlayer({ id: 'me', name: 'Alice', isAdmin: true }), buildPlayer({ id: 'bob' })],
    canStart: true,
    canReveal: false,
    result: null,
    history: [],
    referenceStory: null,
    ...overrides,
  };
}

/** Eine uneinige Runde ohne benannte Ausreißer – per Overrides beliebig anpassbar. */
export function buildResult(overrides: Partial<RoundResult> = {}): RoundResult {
  return { average: 5, suggestedCard: '5', consensus: false, outliers: null, ...overrides };
}

/** Eine frühere Runde, heute um 10 Uhr aufgedeckt, ohne Einigkeit – per Overrides anpassbar. */
export function buildRecord(overrides: Partial<RoundRecord> = {}): RoundRecord {
  return {
    round: 1,
    revealedAt: new Date(2026, 10, 11, 10, 0).getTime(),
    average: 5,
    suggestedCard: '5',
    consensusCard: null,
    ...overrides,
  };
}
