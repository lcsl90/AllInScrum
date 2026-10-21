import type { PlayerView, SessionView } from '@allinscrum/protocol';

export const DECK = ['0', '1', '2', '3', '5', '8', '13', '21', '34', '?', '☕'];

export function buildPlayer(overrides: Partial<PlayerView> & Pick<PlayerView, 'id'>): PlayerView {
  return {
    name: overrides.id[0]!.toUpperCase() + overrides.id.slice(1),
    avatar: null,
    isAdmin: false,
    isOnline: true,
    status: 'pending',
    uncertain: false,
    card: null,
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
    ...overrides,
  };
}
