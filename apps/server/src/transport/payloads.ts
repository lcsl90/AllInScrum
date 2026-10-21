import type {
  Card,
  CreateSessionRequest,
  IgnorePlayerRequest,
  JoinSessionRequest,
  ProfileInput,
} from '@allinscrum/protocol';
import { DomainError } from '../domain/domain-error.ts';

/*
 * Prüft die Form eingehender Socket-Daten. Fachliche Regeln (Namenslänge, Avatar-Format …)
 * prüft die Domäne – hier geht es nur darum, dass ein manipulierter Client nichts Unerwartetes
 * in die Spiellogik schleust.
 */

export function parseCreateSessionRequest(raw: unknown): CreateSessionRequest {
  const value = asRecord(raw);
  return {
    sessionName: asString(value['sessionName']),
    profile: parseProfileInput(value['profile']),
  };
}

export function parseJoinSessionRequest(raw: unknown): JoinSessionRequest {
  const value = asRecord(raw);
  return {
    joinCode: asString(value['joinCode']),
    profile: parseProfileInput(value['profile']),
    resumeToken: optional(value['resumeToken'], asString),
  };
}

export function parseIgnoreRequest(raw: unknown): IgnorePlayerRequest {
  const value = asRecord(raw);
  return { playerId: asString(value['playerId']), ignored: asBoolean(value['ignored']) };
}

/** Eine Karte oder null zum Zurücknehmen. */
export function parseCard(raw: unknown): Card | null {
  return raw === null ? null : asString(raw);
}

export const parseFlag: (raw: unknown) => boolean = asBoolean;

export const parsePlayerId: (raw: unknown) => string = asString;

function parseProfileInput(raw: unknown): ProfileInput {
  const value = asRecord(raw);
  return {
    name: asString(value['name']),
    avatar: value['avatar'] === null ? null : asString(value['avatar']),
  };
}

function asRecord(raw: unknown): Record<string, unknown> {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) throw invalid();
  return raw as Record<string, unknown>;
}

function asString(raw: unknown): string {
  if (typeof raw !== 'string') throw invalid();
  return raw;
}

function asBoolean(raw: unknown): boolean {
  if (typeof raw !== 'boolean') throw invalid();
  return raw;
}

function optional<T>(raw: unknown, parse: (raw: unknown) => T): T | undefined {
  return raw === undefined || raw === null ? undefined : parse(raw);
}

function invalid(): DomainError {
  return new DomainError('invalid-payload');
}
