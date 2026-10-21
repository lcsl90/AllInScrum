import type {
  Ack,
  Card,
  ClientToServerEvents,
  CreateSessionRequest,
  JoinSessionRequest,
  Membership,
  ServerToClientEvents,
  SessionClosedReason,
  SessionView,
} from '@allinscrum/protocol';
import type { Socket } from 'socket.io-client';

export type RealtimeSocket = Socket<ServerToClientEvents, ClientToServerEvents>;
export type Unsubscribe = () => void;

/** SDK-artige Schnittstelle zum Realtime-Server. Komponenten sprechen nie direkt mit dem Socket. */
export interface SessionClient {
  createSession(request: CreateSessionRequest): Promise<Ack<Membership>>;
  joinSession(request: JoinSessionRequest): Promise<Ack<Membership>>;
  leaveSession(): Promise<Ack>;
  startRound(): Promise<Ack>;
  vote(card: Card | null): Promise<Ack>;
  setUncertain(uncertain: boolean): Promise<Ack>;
  ignorePlayer(playerId: string, ignored: boolean): Promise<Ack>;
  reveal(): Promise<Ack>;
  transferAdmin(playerId: string): Promise<Ack>;
  onState(listener: (view: SessionView) => void): Unsubscribe;
  onClosed(listener: (reason: SessionClosedReason) => void): Unsubscribe;
  onConnectionChange(listener: (connected: boolean) => void): Unsubscribe;
  dispose(): void;
}

export interface SessionClientOptions {
  /** So lange wird auf eine Antwort des Servers gewartet. */
  readonly ackTimeoutMs?: number;
}

export function createSessionClient(
  socket: RealtimeSocket,
  { ackTimeoutMs = 8_000 }: SessionClientOptions = {},
): SessionClient {
  /** Wartet auf die Antwort des Servers; bleibt sie aus, gilt der Server als nicht erreichbar. */
  async function request<T>(send: (timed: RealtimeSocket) => Promise<Ack<T>>): Promise<Ack<T>> {
    try {
      return await send(socket.timeout(ackTimeoutMs) as unknown as RealtimeSocket);
    } catch {
      return { ok: false, error: 'server-unreachable' };
    }
  }

  function subscribe<E extends keyof ServerToClientEvents>(
    event: E,
    listener: ServerToClientEvents[E],
  ): Unsubscribe {
    socket.on(event, listener as never);
    return () => void socket.off(event, listener as never);
  }

  return {
    createSession: (payload) => request((s) => s.emitWithAck('session:create', payload)),
    joinSession: (payload) => request((s) => s.emitWithAck('session:join', payload)),
    leaveSession: () => request((s) => s.emitWithAck('session:leave')),
    startRound: () => request((s) => s.emitWithAck('round:start')),
    vote: (card) => request((s) => s.emitWithAck('round:vote', card)),
    setUncertain: (uncertain) => request((s) => s.emitWithAck('round:uncertain', uncertain)),
    ignorePlayer: (playerId, ignored) =>
      request((s) => s.emitWithAck('round:ignore', { playerId, ignored })),
    reveal: () => request((s) => s.emitWithAck('round:reveal')),
    transferAdmin: (playerId) => request((s) => s.emitWithAck('admin:transfer', playerId)),

    onState: (listener) => subscribe('session:state', listener),
    onClosed: (listener) => subscribe('session:closed', listener),

    onConnectionChange(listener) {
      const connected = () => listener(true);
      const disconnected = () => listener(false);
      socket.on('connect', connected);
      socket.on('disconnect', disconnected);
      return () => {
        socket.off('connect', connected);
        socket.off('disconnect', disconnected);
      };
    },

    dispose: () => void socket.disconnect(),
  };
}
