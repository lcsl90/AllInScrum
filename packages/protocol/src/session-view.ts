/** Wert einer Schätzkarte, z. B. "5", "?" oder "☕". */
export type Card = string;

/** lobby: noch keine Runde gestartet · voting: Karten werden gelegt · revealed: aufgedeckt */
export type RoundPhase = 'lobby' | 'voting' | 'revealed';

/** pending: hat noch nicht geschätzt · voted: Karte liegt verdeckt · ignored: setzt diese Runde aus */
export type VoteStatus = 'pending' | 'voted' | 'ignored';

export interface PlayerView {
  readonly id: string;
  readonly name: string;
  /** Data-URL eines verkleinerten Fotos oder null → Initialen anzeigen. */
  readonly avatar: string | null;
  readonly isAdmin: boolean;
  readonly isOnline: boolean;
  readonly status: VoteStatus;
  readonly uncertain: boolean;
  /** Die eigene Karte ist immer sichtbar, fremde Karten erst nach dem Aufdecken. */
  readonly card: Card | null;
  /** Nach dem Aufdecken getauscht? Dann die ursprünglich aufgedeckte Karte, sonst null. */
  readonly replacedCard: Card | null;
}

export interface RoundResult {
  /**
   * Durchschnitt der Zahlenkarten – als nächstgelegene Karte des Decks (bei Fibonacci gibt es keine 6).
   * null, wenn keine Zahlenkarte gelegt wurde.
   */
  readonly average: Card | null;
  /** true, wenn alle gewerteten Spieler dieselbe Karte gelegt haben. */
  readonly consensus: boolean;
}

/** Personalisierte Sicht eines Spielers auf seine Session. */
export interface SessionView {
  /** Schlüssel und Adresse der Session, z. B. "K7Q-X2M". Wer ihn kennt, kann beitreten. */
  readonly joinCode: string;
  readonly name: string;
  readonly deck: readonly Card[];
  readonly phase: RoundPhase;
  readonly round: number;
  readonly youId: string;
  /** In Sitzreihenfolge (Beitrittsreihenfolge). */
  readonly players: readonly PlayerView[];
  readonly canStart: boolean;
  readonly canReveal: boolean;
  readonly result: RoundResult | null;
}
