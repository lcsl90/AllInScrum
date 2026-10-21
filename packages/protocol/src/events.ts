import type { ErrorCode } from './errors.ts';
import type { Card, SessionView } from './session-view.ts';

export interface ProfileInput {
  readonly name: string;
  readonly avatar: string | null;
}

export interface CreateSessionRequest {
  readonly sessionName: string;
  readonly profile: ProfileInput;
}

export interface JoinSessionRequest {
  /** Der Join-Code, z. B. "K7Q-X2M" – Groß-/Kleinschreibung und Leerzeichen egal. */
  readonly joinCode: string;
  readonly profile: ProfileInput;
  /** Geheimnis aus einem früheren Beitritt – stellt Sitzplatz und Karte nach einem Reload wieder her. */
  readonly resumeToken?: string | undefined;
}

export interface IgnorePlayerRequest {
  readonly playerId: string;
  readonly ignored: boolean;
}

export interface Membership {
  readonly joinCode: string;
  readonly playerId: string;
  readonly resumeToken: string;
}

export type Ack<T = null> =
  { readonly ok: true; readonly data: T } | { readonly ok: false; readonly error: ErrorCode };

export type AckCallback<T = null> = (response: Ack<T>) => void;

export type SessionClosedReason = 'expired';

export interface ClientToServerEvents {
  'session:create': (request: CreateSessionRequest, ack: AckCallback<Membership>) => void;
  'session:join': (request: JoinSessionRequest, ack: AckCallback<Membership>) => void;
  'session:leave': (ack: AckCallback) => void;
  'round:start': (ack: AckCallback) => void;
  'round:vote': (card: Card | null, ack: AckCallback) => void;
  'round:uncertain': (uncertain: boolean, ack: AckCallback) => void;
  'round:ignore': (request: IgnorePlayerRequest, ack: AckCallback) => void;
  'round:reveal': (ack: AckCallback) => void;
  /** Sich selbst als Zuschauer aus der Schätzung nehmen (true) oder wieder einsteigen (false). */
  'player:spectate': (spectating: boolean, ack: AckCallback) => void;
  'admin:transfer': (playerId: string, ack: AckCallback) => void;
}

export interface ServerToClientEvents {
  'session:state': (view: SessionView) => void;
  'session:closed': (reason: SessionClosedReason) => void;
}
