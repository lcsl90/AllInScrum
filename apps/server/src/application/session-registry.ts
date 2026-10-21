import type { Card, ProfileInput } from '@allinscrum/protocol';
import type { Clock } from '../domain/clock.ts';
import { DomainError } from '../domain/domain-error.ts';
import { generateJoinCode, normalizeJoinCode } from '../domain/join-code.ts';
import { type Membership, type PresencePolicy, Session } from '../domain/session.ts';

export interface RegistrySettings {
  readonly deck: readonly Card[];
  readonly maxSessions: number;
  readonly maxPlayersPerSession: number;
  readonly sessionIdleTimeoutMs: number;
  readonly presence: PresencePolicy;
  readonly clock: Clock;
}

export interface OpenSessionCommand {
  readonly name: string;
  readonly host: ProfileInput;
}

export interface OpenedSession {
  readonly session: Session;
  readonly host: Membership;
}

export interface SweepOutcome {
  /** Join-Codes der gelöschten Sessions. */
  readonly expired: readonly string[];
  /** Sessions, deren Tisch sich durch die Präsenzregeln verändert hat. */
  readonly changed: readonly Session[];
}

/** Hält alle Sessions im Arbeitsspeicher – auffindbar nur über ihren Join-Code. */
export class SessionRegistry {
  private readonly settings: RegistrySettings;
  private readonly sessions = new Map<string, Session>();

  constructor(settings: RegistrySettings) {
    this.settings = settings;
  }

  /** Eröffnet eine Session und setzt den Gastgeber als Admin an den Tisch – ganz oder gar nicht. */
  open(command: OpenSessionCommand): OpenedSession {
    if (this.sessions.size >= this.settings.maxSessions) throw new DomainError('too-many-sessions');
    const session = new Session({
      joinCode: this.unusedJoinCode(),
      name: command.name,
      deck: this.settings.deck,
      maxPlayers: this.settings.maxPlayersPerSession,
      clock: this.settings.clock,
    });
    const host = session.join({ profile: command.host });
    this.sessions.set(session.joinCode, session);
    return { session, host };
  }

  /** Findet die Session zu einem (beliebig getippten) Join-Code. */
  get(joinCode: string): Session {
    const session = this.find(joinCode);
    if (!session) throw new DomainError('session-not-found');
    return session;
  }

  find(joinCode: string): Session | undefined {
    const normalized = normalizeJoinCode(joinCode);
    return normalized === null ? undefined : this.sessions.get(normalized);
  }

  /** Löscht inaktive Sessions und setzt in den übrigen die Präsenzregeln durch. Läuft periodisch. */
  sweep(): SweepOutcome {
    const expired: string[] = [];
    const changed: Session[] = [];
    for (const session of this.sessions.values()) {
      if (session.isIdleLongerThan(this.settings.sessionIdleTimeoutMs)) {
        this.sessions.delete(session.joinCode);
        expired.push(session.joinCode);
      } else if (session.applyPresencePolicy(this.settings.presence)) {
        changed.push(session);
      }
    }
    return { expired, changed };
  }

  private unusedJoinCode(): string {
    let code = generateJoinCode();
    while (this.sessions.has(code)) code = generateJoinCode();
    return code;
  }
}
