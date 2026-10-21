import type { Card, RoundResult, VoteStatus } from '@allinscrum/protocol';
import { SIGNAL_CARDS } from './deck.ts';
import { DomainError } from './domain-error.ts';
import { summarizeRound } from './round-result.ts';

/** Eine einzelne Schätzrunde: verdeckte Karten, Unsicherheiten, Aussetzer, Aufdecken und Tauschen. */
export class Round {
  readonly number: number;
  private readonly deck: readonly Card[];
  private revealed = false;
  private readonly cards = new Map<string, Card>();
  /** Stand beim Aufdecken – damit getauschte Karten sichtbar bleiben. */
  private readonly revealedCards = new Map<string, Card>();
  private readonly uncertainPlayers = new Set<string>();
  private readonly ignoredPlayers = new Set<string>();

  constructor(number: number, deck: readonly Card[]) {
    this.number = number;
    this.deck = deck;
  }

  get phase(): 'voting' | 'revealed' {
    return this.revealed ? 'revealed' : 'voting';
  }

  get isVoting(): boolean {
    return !this.revealed;
  }

  /** Vor dem Aufdecken: Karte legen oder zurücknehmen (null). Danach: nur noch tauschen. */
  vote(playerId: string, card: Card | null): void {
    if (this.ignoredPlayers.has(playerId)) throw new DomainError('player-ignored');
    if (this.revealed) {
      this.swap(playerId, card);
      return;
    }
    if (card === null) {
      this.cards.delete(playerId);
      return;
    }
    this.assertInDeck(card);
    this.cards.set(playerId, card);
  }

  /** Die Diskussion hat überzeugt: Die Karte wird getauscht, die aufgedeckte bleibt sichtbar. */
  private swap(playerId: string, card: Card | null): void {
    if (!this.revealedCards.has(playerId)) throw new DomainError('round-not-active');
    if (card === null) throw new DomainError('invalid-card');
    this.assertInDeck(card);
    this.cards.set(playerId, card);
  }

  private assertInDeck(card: Card): void {
    if (!this.deck.includes(card)) throw new DomainError('invalid-card');
  }

  setUncertain(playerId: string, uncertain: boolean): void {
    toggle(this.uncertainPlayers, playerId, uncertain);
  }

  ignore(playerId: string, ignored: boolean): void {
    this.assertVoting();
    toggle(this.ignoredPlayers, playerId, ignored);
    if (ignored) this.cards.delete(playerId);
  }

  /** Entfernt alle Spuren eines Spielers, der den Tisch verlassen hat. */
  forget(playerId: string): void {
    this.cards.delete(playerId);
    this.revealedCards.delete(playerId);
    this.uncertainPlayers.delete(playerId);
    this.ignoredPlayers.delete(playerId);
  }

  /** true, wenn mindestens eine Karte liegt und jeder übrige Spieler gelegt hat oder aussetzt. */
  isCompleteFor(playerIds: Iterable<string>): boolean {
    if (this.cards.size === 0) return false;
    return [...playerIds].every((id) => this.cards.has(id) || this.ignoredPlayers.has(id));
  }

  reveal(): void {
    this.assertVoting();
    this.revealed = true;
    this.cards.forEach((card, playerId) => this.revealedCards.set(playerId, card));
  }

  /** Die ursprünglich aufgedeckte Karte – aber nur, wenn sie danach getauscht wurde. */
  replacedCardOf(playerId: string): Card | null {
    const original = this.revealedCards.get(playerId);
    return original !== undefined && original !== this.cards.get(playerId) ? original : null;
  }

  statusOf(playerId: string): VoteStatus {
    if (this.ignoredPlayers.has(playerId)) return 'ignored';
    return this.cards.has(playerId) ? 'voted' : 'pending';
  }

  /** Die Karte ist nur für den Spieler selbst sichtbar – oder für alle, sobald sie offen liegt. */
  cardVisibleTo(viewerId: string, playerId: string): Card | null {
    if (viewerId !== playerId && !this.isCardOpen(playerId)) return null;
    return this.cards.get(playerId) ?? null;
  }

  /** Offen liegen alle Karten nach dem Aufdecken – Signalkarten wie "?" schon vorher. */
  isCardOpen(playerId: string): boolean {
    const card = this.cards.get(playerId);
    return card !== undefined && (this.revealed || SIGNAL_CARDS.includes(card));
  }

  isUncertain(playerId: string): boolean {
    return this.uncertainPlayers.has(playerId);
  }

  result(): RoundResult | null {
    return this.revealed ? summarizeRound([...this.cards.values()], this.deck) : null;
  }

  private assertVoting(): void {
    if (this.revealed) throw new DomainError('round-not-active');
  }
}

function toggle(set: Set<string>, value: string, present: boolean): void {
  if (present) set.add(value);
  else set.delete(value);
}
