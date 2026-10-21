import { randomUUID } from 'node:crypto';
import type {
  Card,
  ErrorCode,
  PlayerView,
  ProfileInput,
  RoundPhase,
  SessionView,
} from '@allinscrum/protocol';
import type { Clock } from './clock.ts';
import { DomainError, throwIfViolated } from './domain-error.ts';
import { parseProfile } from './player-profile.ts';
import { Round } from './round.ts';

export const MIN_PLAYERS_PER_ROUND = 2;
export const MAX_SESSION_NAME_LENGTH = 40;

export interface SessionSettings {
  /** Schlüssel und Adresse der Session – wer ihn kennt, darf an den Tisch. */
  readonly joinCode: string;
  readonly name: string;
  readonly deck: readonly Card[];
  readonly maxPlayers: number;
  readonly clock: Clock;
}

export interface JoinRequest {
  readonly profile: ProfileInput;
  readonly resumeToken?: string | undefined;
}

export interface Membership {
  readonly playerId: string;
  readonly resumeToken: string;
}

export interface PresencePolicy {
  /** So lange darf der Admin getrennt sein, bevor die Rolle automatisch weitergegeben wird. */
  readonly adminHandoverAfterMs: number;
  /** So lange darf ein Spieler getrennt sein, bevor er vom Tisch entfernt wird. */
  readonly removeOfflineAfterMs: number;
}

interface Player {
  readonly id: string;
  /** Geheimnis, mit dem nur dieser Spieler nach einem Reload auf seinen Platz zurückkehrt. */
  readonly resumeToken: string;
  readonly name: string;
  readonly avatar: string | null;
  /** Zeitpunkt der Verbindungstrennung oder null, solange verbunden. */
  offlineSince: number | null;
}

/** Ein Pokertisch: Spieler, Admin-Rolle und die aktuelle Schätzrunde. */
export class Session {
  readonly joinCode: string;
  readonly name: string;
  private readonly deck: readonly Card[];
  private readonly maxPlayers: number;
  private readonly clock: Clock;
  private readonly players = new Map<string, Player>();
  private adminId: string | null = null;
  private round: Round | null = null;
  private lastActivityAt: number;

  constructor(settings: SessionSettings) {
    this.joinCode = settings.joinCode;
    this.name = parseSessionName(settings.name);
    this.deck = settings.deck;
    this.maxPlayers = settings.maxPlayers;
    this.clock = settings.clock;
    this.lastActivityAt = settings.clock();
  }

  /** Setzt einen neuen Spieler an den Tisch – oder einen zurückkehrenden auf seinen alten Platz. */
  join(request: JoinRequest): Membership {
    const returning = this.playerByResumeToken(request.resumeToken);
    if (returning) {
      returning.offlineSince = null;
      this.touch();
      return membershipOf(returning);
    }
    if (this.players.size >= this.maxPlayers) throw new DomainError('session-full');
    const player: Player = {
      id: randomUUID(),
      resumeToken: randomUUID(),
      ...parseProfile(request.profile),
      offlineSince: null,
    };
    this.players.set(player.id, player);
    this.adminId ??= player.id;
    this.touch();
    return membershipOf(player);
  }

  leave(playerId: string): void {
    this.assertMember(playerId);
    this.removePlayer(playerId);
    this.touch();
  }

  setOnline(playerId: string, online: boolean): void {
    const player = this.players.get(playerId);
    if (!player) return;
    player.offlineSince = online ? null : this.clock();
  }

  /**
   * Setzt die Präsenzregeln durch: Rollenübergabe bei abwesendem Admin.
   * @returns true, wenn sich dadurch etwas am Tisch geändert hat.
   */
  applyPresencePolicy(policy: PresencePolicy): boolean {
    const removedSomeone = this.removePlayersOfflineLongerThan(policy.removeOfflineAfterMs);
    const handedOver = this.handOverAdminIfOfflineLongerThan(policy.adminHandoverAfterMs);
    return removedSomeone || handedOver;
  }

  transferAdmin(by: string, to: string): void {
    this.assertAdmin(by);
    this.assertPlayerExists(to);
    this.adminId = to;
    this.touch();
  }

  startRound(by: string): void {
    throwIfViolated(this.startRoundViolation(by));
    this.round = new Round((this.round?.number ?? 0) + 1, this.deck);
    this.touch();
  }

  /** Legt eine Karte ab; `null` nimmt die Karte zurück. */
  vote(playerId: string, card: Card | null): void {
    this.assertMember(playerId);
    this.activeRound().vote(playerId, card);
    this.touch();
  }

  setUncertain(playerId: string, uncertain: boolean): void {
    this.assertMember(playerId);
    this.activeRound().setUncertain(playerId, uncertain);
    this.touch();
  }

  /** Lässt einen Spieler die laufende Runde aussetzen (oder holt ihn zurück). */
  ignore(by: string, playerId: string, ignored: boolean): void {
    this.assertAdmin(by);
    this.assertPlayerExists(playerId);
    this.activeRound().ignore(playerId, ignored);
    this.touch();
  }

  reveal(by: string): void {
    throwIfViolated(this.revealViolation(by));
    this.activeRound().reveal();
    this.touch();
  }

  /** Inaktiv heißt: Niemand hat etwas getan. Bloßes Verbundensein zählt nicht. */
  isIdleLongerThan(milliseconds: number): boolean {
    return this.clock() - this.lastActivityAt > milliseconds;
  }

  viewFor(viewerId: string): SessionView {
    return {
      joinCode: this.joinCode,
      name: this.name,
      deck: this.deck,
      phase: this.phase,
      round: this.round?.number ?? 0,
      youId: viewerId,
      players: [...this.players.values()].map((player) => this.toPlayerView(player, viewerId)),
      canStart: this.startRoundViolation(viewerId) === null,
      canReveal: this.revealViolation(viewerId) === null,
      result: this.round?.result() ?? null,
    };
  }

  private get phase(): RoundPhase {
    return this.round?.phase ?? 'lobby';
  }

  private touch(): void {
    this.lastActivityAt = this.clock();
  }

  private playerByResumeToken(resumeToken: string | undefined): Player | undefined {
    if (!resumeToken) return undefined;
    return [...this.players.values()].find((player) => player.resumeToken === resumeToken);
  }

  private removePlayer(playerId: string): void {
    this.players.delete(playerId);
    this.round?.forget(playerId);
    if (playerId === this.adminId) {
      this.adminId = this.longestPresentOnlinePlayerId() ?? this.longestPresentPlayerId();
    }
  }

  private removePlayersOfflineLongerThan(milliseconds: number): boolean {
    const absent = [...this.players.values()].filter((player) =>
      this.isOfflineLongerThan(player, milliseconds),
    );
    absent.forEach((player) => this.removePlayer(player.id));
    return absent.length > 0;
  }

  private handOverAdminIfOfflineLongerThan(milliseconds: number): boolean {
    const admin = this.adminId === null ? undefined : this.players.get(this.adminId);
    if (!admin || !this.isOfflineLongerThan(admin, milliseconds)) return false;
    const successor = this.longestPresentOnlinePlayerId();
    if (successor === null) return false;
    this.adminId = successor;
    return true;
  }

  /** Spieler sind in Beitrittsreihenfolge gespeichert – der erste sitzt am längsten am Tisch. */
  private longestPresentPlayerId(): string | null {
    return this.players.keys().next().value ?? null;
  }

  private longestPresentOnlinePlayerId(): string | null {
    for (const player of this.players.values()) {
      if (player.offlineSince === null) return player.id;
    }
    return null;
  }

  private isOfflineLongerThan(player: Player, milliseconds: number): boolean {
    return player.offlineSince !== null && this.clock() - player.offlineSince > milliseconds;
  }

  private activeRound(): Round {
    if (!this.round) throw new DomainError('round-not-active');
    return this.round;
  }

  private assertAdmin(playerId: string): void {
    if (playerId !== this.adminId) throw new DomainError('not-admin');
  }

  /** Für den Handelnden selbst: Ist er überhaupt am Tisch? */
  private assertMember(playerId: string): void {
    if (!this.players.has(playerId)) throw new DomainError('not-a-member');
  }

  /** Für den Betroffenen einer Admin-Aktion. */
  private assertPlayerExists(playerId: string): void {
    if (!this.players.has(playerId)) throw new DomainError('player-not-found');
  }

  private startRoundViolation(by: string): ErrorCode | null {
    if (by !== this.adminId) return 'not-admin';
    if (this.phase === 'voting') return 'round-already-active';
    if (this.players.size < MIN_PLAYERS_PER_ROUND) return 'not-enough-players';
    return null;
  }

  private revealViolation(by: string): ErrorCode | null {
    if (by !== this.adminId) return 'not-admin';
    if (!this.round?.isVoting) return 'round-not-active';
    if (!this.round.isCompleteFor(this.players.keys())) return 'votes-missing';
    return null;
  }

  private toPlayerView(player: Player, viewerId: string): PlayerView {
    return {
      id: player.id,
      name: player.name,
      avatar: player.avatar,
      isAdmin: player.id === this.adminId,
      isOnline: player.offlineSince === null,
      status: this.round?.statusOf(player.id) ?? 'pending',
      uncertain: this.round?.isUncertain(player.id) ?? false,
      card: this.round?.cardVisibleTo(viewerId, player.id) ?? null,
      replacedCard: this.round?.replacedCardOf(player.id) ?? null,
    };
  }
}

function parseSessionName(raw: string): string {
  const name = raw.trim();
  if (name.length === 0 || name.length > MAX_SESSION_NAME_LENGTH) {
    throw new DomainError('invalid-session-name');
  }
  return name;
}

function membershipOf(player: Player): Membership {
  return { playerId: player.id, resumeToken: player.resumeToken };
}
