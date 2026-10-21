export const ERROR_CODES = [
  'invalid-payload',
  'invalid-name',
  'invalid-avatar',
  'invalid-session-name',
  'session-not-found',
  'session-full',
  'too-many-sessions',
  'too-many-attempts',
  'not-a-member',
  'player-not-found',
  'not-admin',
  'not-enough-players',
  'round-not-active',
  'round-already-active',
  'invalid-card',
  'player-ignored',
  'votes-missing',
  'internal',
  /** Nur clientseitig: Der Server hat nicht rechtzeitig geantwortet. */
  'server-unreachable',
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];
