import type {
  AckCallback,
  ClientToServerEvents,
  ErrorCode,
  JoinSessionRequest,
  ServerToClientEvents,
  SessionClosedReason,
} from '@allinscrum/protocol';
import type { Server, Socket } from 'socket.io';
import type { AttemptLimiter } from '../application/attempt-limiter.ts';
import type { SessionRegistry } from '../application/session-registry.ts';
import { DomainError } from '../domain/domain-error.ts';
import type { Session } from '../domain/session.ts';
import {
  parseCard,
  parseCreateSessionRequest,
  parseFlag,
  parseIgnoreRequest,
  parseJoinSessionRequest,
  parsePlayerId,
} from './payloads.ts';

/** Welcher Spieler an welchem Tisch hinter einem Socket sitzt. */
interface SeatMembership {
  readonly joinCode: string;
  readonly playerId: string;
}

interface SocketData {
  membership?: SeatMembership;
}

type RealtimeServer = Server<ClientToServerEvents, ServerToClientEvents, object, SocketData>;
type RealtimeSocket = Socket<ClientToServerEvents, ServerToClientEvents, object, SocketData>;
export type Handshake = Socket['handshake'];

export interface RealtimeGatewayDependencies {
  readonly registry: SessionRegistry;
  /** Bremst das Durchprobieren von Join-Codes pro Client-Adresse. */
  readonly joinAttempts: AttemptLimiter;
  /** Ermittelt die Adresse des Clients – hinter einem Reverse Proxy z. B. aus X-Forwarded-For. */
  readonly clientAddress?: (handshake: Handshake) => string;
}

export interface RealtimeGateway {
  /** Räumt inaktive Sessions auf und verteilt die Folgen an alle Betroffenen. */
  sweep(): Promise<void>;
}

/** Verbindet Socket.IO-Events mit der Spiellogik und verteilt personalisierte Sichten. */
export function attachRealtimeGateway(
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  dependencies: RealtimeGatewayDependencies,
): RealtimeGateway {
  const server = io as RealtimeServer;
  const { registry, joinAttempts } = dependencies;
  const clientAddress = dependencies.clientAddress ?? ((handshake) => handshake.address);

  server.on('connection', (socket: RealtimeSocket) => {
    socket.on('session:create', (raw, ack) =>
      respond(ack, () => {
        const request = parseCreateSessionRequest(raw);
        const { session, host } = registry.open({ name: request.sessionName, host: request.profile });
        seat(socket, session, host.playerId);
        return { joinCode: session.joinCode, ...host };
      }),
    );

    socket.on('session:join', (raw, ack) =>
      respond(ack, () => {
        const request = parseJoinSessionRequest(raw);
        const session = findSessionFor(socket, request);
        const membership = session.join({
          profile: request.profile,
          resumeToken: request.resumeToken,
        });
        seat(socket, session, membership.playerId);
        return { joinCode: session.joinCode, ...membership };
      }),
    );

    const onMemberCommand = (
      action: (session: Session, me: string) => void,
    ): ((ack: AckCallback) => void) => {
      return (ack) => respond(ack, () => actAsMember(socket, action));
    };

    socket.on('round:start', onMemberCommand((session, me) => session.startRound(me)));
    socket.on('round:reveal', onMemberCommand((session, me) => session.reveal(me)));

    socket.on('round:vote', (raw, ack) =>
      onMemberCommand((session, me) => session.vote(me, parseCard(raw)))(ack),
    );

    socket.on('round:uncertain', (raw, ack) =>
      onMemberCommand((session, me) => session.setUncertain(me, parseFlag(raw)))(ack),
    );

    socket.on('round:ignore', (raw, ack) =>
      onMemberCommand((session, me) => {
        const request = parseIgnoreRequest(raw);
        session.ignore(me, request.playerId, request.ignored);
      })(ack),
    );

    socket.on('admin:transfer', (raw, ack) =>
      onMemberCommand((session, me) => session.transferAdmin(me, parsePlayerId(raw)))(ack),
    );

    socket.on('session:leave', (ack) =>
      respond(ack, () => {
        actAsMember(socket, (session, me) => session.leave(me));
        unseat(socket);
        return null;
      }),
    );

    socket.on('disconnect', () => {
      if (socket.data.membership) void markOfflineIfLastConnection(socket.id, socket.data.membership);
    });
  });

  /** Sessions sind unsichtbar – wer zu oft falsche Codes probiert, wird ausgebremst. */
  function findSessionFor(socket: RealtimeSocket, request: JoinSessionRequest): Session {
    const address = clientAddress(socket.handshake);
    if (joinAttempts.isBlocked(address)) throw new DomainError('too-many-attempts');
    const session = registry.find(request.joinCode);
    if (!session) {
      joinAttempts.recordFailure(address);
      throw new DomainError('session-not-found');
    }
    return session;
  }

  /** Ein Spieler kann mehrere Tabs offen haben – offline ist er erst, wenn der letzte geht. */
  async function markOfflineIfLastConnection(
    socketId: string,
    membership: SeatMembership,
  ): Promise<void> {
    const session = registry.find(membership.joinCode);
    if (!session) return;
    const remaining = await server.in(roomOf(session.joinCode)).fetchSockets();
    const stillConnected = remaining.some(
      (other) => other.id !== socketId && other.data.membership?.playerId === membership.playerId,
    );
    if (stillConnected) return;
    session.setOnline(membership.playerId, false);
    void broadcastSession(session);
  }

  /** Führt eine Aktion im Namen des Spielers aus, der hinter diesem Socket sitzt, und verteilt das Ergebnis. */
  function actAsMember(
    socket: RealtimeSocket,
    action: (session: Session, playerId: string) => void,
  ): null {
    const membership = socket.data.membership;
    if (!membership) throw new DomainError('not-a-member');
    const session = registry.get(membership.joinCode);
    action(session, membership.playerId);
    void broadcastSession(session);
    return null;
  }

  function seat(socket: RealtimeSocket, session: Session, playerId: string): void {
    const previous = socket.data.membership;
    if (previous && previous.joinCode !== session.joinCode) {
      unseat(socket);
      void markOfflineIfLastConnection(socket.id, previous);
    }
    socket.data.membership = { joinCode: session.joinCode, playerId };
    void socket.join(roomOf(session.joinCode));
    void broadcastSession(session);
  }

  function unseat(socket: RealtimeSocket): void {
    const membership = socket.data.membership;
    if (!membership) return;
    delete socket.data.membership;
    void socket.leave(roomOf(membership.joinCode));
  }

  /** Jeder Spieler bekommt seine eigene Sicht – fremde Karten bleiben bis zum Aufdecken geheim. */
  async function broadcastSession(session: Session): Promise<void> {
    const sockets = await server.in(roomOf(session.joinCode)).fetchSockets();
    for (const member of sockets) {
      const playerId = member.data.membership?.playerId;
      if (playerId) member.emit('session:state', session.viewFor(playerId));
    }
  }

  /** Schickt alle Spieler einer gelöschten Session vom Tisch. */
  async function closeSession(joinCode: string, reason: SessionClosedReason): Promise<void> {
    const room = roomOf(joinCode);
    for (const member of await server.in(room).fetchSockets()) {
      delete member.data.membership;
      member.emit('session:closed', reason);
    }
    server.in(room).socketsLeave(room);
  }

  return {
    async sweep() {
      const { expired, changed } = registry.sweep();
      await Promise.all(expired.map((joinCode) => closeSession(joinCode, 'expired')));
      changed.forEach((session) => void broadcastSession(session));
      joinAttempts.prune();
    },
  };
}

/** Führt eine Aktion aus und beantwortet das Event mit dem Ergebnis oder einem Fehlercode. */
function respond<T>(ack: AckCallback<T>, action: () => T): void {
  // Ohne Callback kann ein (manipulierter) Client keine Antwort empfangen – Event verwerfen.
  if (typeof ack !== 'function') return;
  try {
    ack({ ok: true, data: action() });
  } catch (error) {
    ack({ ok: false, error: toErrorCode(error) });
  }
}

function toErrorCode(error: unknown): ErrorCode {
  if (error instanceof DomainError) return error.code;
  console.error('Unerwarteter Fehler im Realtime-Gateway', error);
  return 'internal';
}

function roomOf(joinCode: string): string {
  return `session:${joinCode}`;
}
