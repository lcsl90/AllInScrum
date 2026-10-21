import type { Ack, Membership, SessionClosedReason, SessionView } from '@allinscrum/protocol';
import { act } from '@testing-library/react';
import type { SessionClient, Unsubscribe } from '../realtime/session-client.ts';

type Command = Exclude<keyof SessionClient, 'onState' | 'onClosed' | 'onConnectionChange' | 'dispose'>;

export interface RecordedCall {
  readonly command: Command;
  readonly args: readonly unknown[];
}

const OK: Ack = { ok: true, data: null };

/**
 * Ersetzt die Netzwerkverbindung in Komponententests: zeichnet gesendete Befehle auf und lässt
 * Tests Server-Nachrichten einspielen.
 */
export class FakeSessionClient implements SessionClient {
  readonly calls: RecordedCall[] = [];
  private readonly responses = new Map<Command, Ack<unknown>>();
  private readonly stateListeners = new Set<(view: SessionView) => void>();
  private readonly closedListeners = new Set<(reason: SessionClosedReason) => void>();
  private readonly connectionListeners = new Set<(connected: boolean) => void>();

  /** Legt fest, was der "Server" auf einen Befehl antwortet. */
  respond(command: Command, response: Ack<unknown>): void {
    this.responses.set(command, response);
  }

  callsOf(command: Command): (readonly unknown[])[] {
    return this.calls.filter((call) => call.command === command).map((call) => call.args);
  }

  pushState(view: SessionView): void {
    act(() => this.stateListeners.forEach((listener) => listener(view)));
  }

  pushClosed(reason: SessionClosedReason): void {
    act(() => this.closedListeners.forEach((listener) => listener(reason)));
  }

  pushConnection(connected: boolean): void {
    act(() => this.connectionListeners.forEach((listener) => listener(connected)));
  }

  createSession = (...args: unknown[]) => this.record('createSession', args, defaultMembership);
  joinSession = (...args: unknown[]) => this.record('joinSession', args, defaultMembership);
  leaveSession = (...args: unknown[]) => this.record('leaveSession', args);
  startRound = (...args: unknown[]) => this.record('startRound', args);
  vote = (...args: unknown[]) => this.record('vote', args);
  setUncertain = (...args: unknown[]) => this.record('setUncertain', args);
  ignorePlayer = (...args: unknown[]) => this.record('ignorePlayer', args);
  reveal = (...args: unknown[]) => this.record('reveal', args);
  transferAdmin = (...args: unknown[]) => this.record('transferAdmin', args);

  onState(listener: (view: SessionView) => void): Unsubscribe {
    this.stateListeners.add(listener);
    return () => this.stateListeners.delete(listener);
  }

  onClosed(listener: (reason: SessionClosedReason) => void): Unsubscribe {
    this.closedListeners.add(listener);
    return () => this.closedListeners.delete(listener);
  }

  onConnectionChange(listener: (connected: boolean) => void): Unsubscribe {
    this.connectionListeners.add(listener);
    return () => this.connectionListeners.delete(listener);
  }

  dispose(): void {}

  private record<T>(command: Command, args: unknown[], fallback?: (args: unknown[]) => Ack<T>) {
    this.calls.push({ command, args });
    const response = this.responses.get(command) ?? fallback?.(args) ?? OK;
    return Promise.resolve(response as Ack<never>);
  }
}

function defaultMembership(args: unknown[]): Ack<Membership> {
  const request = args[0] as { joinCode?: string } | undefined;
  return {
    ok: true,
    data: { joinCode: request?.joinCode ?? 'NEU-123', playerId: 'me', resumeToken: 'token-me' },
  };
}
