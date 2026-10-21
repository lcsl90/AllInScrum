/** Wert einer Schätzkarte, z. B. "5", "?" oder COFFEE_CARD. */
export type Card = string;

/** Die Pausenkarte ("Ich brauche einen Kaffee") – das Frontend zeigt sie als Tassen-Symbol. */
export const COFFEE_CARD: Card = 'coffee';

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
  /** Schaut nur zu (z. B. Scrum Master) – setzt jede Runde aus, bis er selbst wieder einsteigt. */
  readonly isSpectator: boolean;
  readonly status: VoteStatus;
  readonly uncertain: boolean;
  /** Die eigene Karte ist immer sichtbar, fremde Karten erst nach dem Aufdecken. */
  readonly card: Card | null;
  /** Liegt die Karte für alle offen? Nach dem Aufdecken – Signalkarten wie "?" schon vorher. */
  readonly cardOpen: boolean;
  /** Nach dem Aufdecken getauscht? Dann die ursprünglich aufgedeckte Karte, sonst null. */
  readonly replacedCard: Card | null;
}

export interface RoundResult {
  /** Echter Mittelwert der Zahlenkarten, z. B. 6.5 – null, wenn keine Zahlenkarte gelegt wurde. */
  readonly average: number | null;
  /**
   * Die Karte des Decks, die dem Mittelwert am nächsten liegt (bei Fibonacci gibt es keine 6 –
   * aus 6.5 wird die 8). null, wenn keine Zahlenkarte gelegt wurde.
   */
  readonly suggestedCard: Card | null;
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
