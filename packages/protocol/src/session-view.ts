/** Wert einer Schätzkarte, z. B. "5", "?" oder COFFEE_CARD. */
export type Card = string;

/** Die Pausenkarte ("Ich brauche einen Kaffee") – das Frontend zeigt sie als Tassen-Symbol. */
export const COFFEE_CARD: Card = 'coffee';

/** "Keine Ahnung" – die Story ist unklar. */
export const UNKNOWN_CARD: Card = '?';

/**
 * Karten ohne Schätzwert, die etwas signalisieren: Klärungsbedarf oder Pausenwunsch. Sie verraten
 * keine Zahl, an der sich andere orientieren könnten – deshalb liegen sie sofort offen, und das
 * Team kann reagieren, ohne die Runde erst zu Ende zu spielen.
 */
export const SIGNAL_CARDS: readonly Card[] = [UNKNOWN_CARD, COFFEE_CARD];

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

/** Eine Karte und alle, die sie gelegt haben. */
export interface Estimate {
  readonly card: Card;
  readonly playerIds: readonly string[];
}

/**
 * Die Spannweite einer uneinigen Runde: Wer am niedrigsten und wer am höchsten geschätzt hat,
 * begründet seine Karte – so lernt das Team, was die anderen sehen.
 */
export interface Outliers {
  readonly lowest: Estimate;
  readonly highest: Estimate;
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
  /**
   * Niedrigste und höchste Schätzung nach Reihenfolge im Deck, ohne Signalkarten wie "?" –
   * null, solange es keine zwei verschiedenen Schätzungen gibt.
   */
  readonly outliers: Outliers | null;
}

/** Ein Anker für die Skala: eine bekannte Story und die Punkte, die das Team ihr gegeben hat. */
export interface ReferenceStory {
  readonly title: string;
  readonly card: Card;
}

/** Eine frühere, aufgedeckte Runde – so, wie sie am Ende (nach allen Tauschen) stand. */
export interface RoundRecord {
  readonly round: number;
  /** Zeitpunkt des Aufdeckens in Millisekunden seit 1970 (UTC). */
  readonly revealedAt: number;
  readonly average: number | null;
  readonly suggestedCard: Card | null;
  /** Die Karte, die alle gelegt haben – null, wenn sich das Team nicht einig war. */
  readonly consensusCard: Card | null;
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
  /** Frühere Runden der letzten 24 Stunden, älteste zuerst – ohne die gerade aufgedeckte. */
  readonly history: readonly RoundRecord[];
  /** Vom Admin hinterlegt – oder null, solange es keine gibt. */
  readonly referenceStory: ReferenceStory | null;
}
