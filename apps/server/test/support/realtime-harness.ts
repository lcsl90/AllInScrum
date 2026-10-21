import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import type { ClientToServerEvents, ServerToClientEvents, SessionView } from '@allinscrum/protocol';
import { Server } from 'socket.io';
import { io as connectClient, type Socket } from 'socket.io-client';
import { AttemptLimiter } from '../../src/application/attempt-limiter.ts';
import { type RegistrySettings, SessionRegistry } from '../../src/application/session-registry.ts';
import { DEFAULT_DECK } from '../../src/domain/deck.ts';
import {
  attachRealtimeGateway,
  type RealtimeGateway,
} from '../../src/transport/realtime-gateway.ts';
import { FakeClock, minutes, seconds } from './fake-clock.ts';

type ClientSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

/** Ein echter Socket.IO-Client, der die zuletzt empfangenen Server-Nachrichten mitschreibt. */
export class TestClient {
  readonly socket: ClientSocket;
  private views: SessionView[] = [];
  private closedReasons: string[] = [];

  constructor(socket: ClientSocket) {
    this.socket = socket;
    socket.on('session:state', (view) => this.views.push(view));
    socket.on('session:closed', (reason) => this.closedReasons.push(reason));
  }

  /** Sendet ein Event und wartet auf die Antwort des Servers (max. 1 s). */
  get emit() {
    const socket = this.socket.timeout(1000);
    return socket.emitWithAck.bind(socket);
  }

  /** Sendet beliebige, ungetypte Daten – so wie es ein manipulierter Client könnte. */
  emitUntyped(event: string, ...args: unknown[]): Promise<unknown> {
    const socket = this.socket.timeout(1000) as unknown as {
      emitWithAck: (event: string, ...args: unknown[]) => Promise<unknown>;
    };
    return socket.emitWithAck(event, ...args);
  }

  get view(): SessionView | undefined {
    return this.views.at(-1);
  }

  get closedReason(): string | undefined {
    return this.closedReasons.at(-1);
  }

  /** Wartet, bis die zuletzt empfangene Sicht die Bedingung erfüllt. */
  async viewWhere(predicate: (view: SessionView) => boolean): Promise<SessionView> {
    await eventually(() => this.view !== undefined && predicate(this.view));
    return this.view as SessionView;
  }

  async closed(): Promise<string> {
    await eventually(() => this.closedReason !== undefined);
    return this.closedReason as string;
  }

  disconnect(): void {
    this.socket.disconnect();
  }
}

export interface TestServer {
  readonly url: string;
  readonly clock: FakeClock;
  readonly gateway: RealtimeGateway;
  connect(): Promise<TestClient>;
  close(): Promise<void>;
}

export async function startTestServer(
  overrides: Partial<RegistrySettings> = {},
): Promise<TestServer> {
  const clock = new FakeClock();
  const registry = new SessionRegistry({
    deck: DEFAULT_DECK,
    maxSessions: 100,
    maxPlayersPerSession: 16,
    sessionIdleTimeoutMs: minutes(60),
    presence: { adminHandoverAfterMs: seconds(30), removeOfflineAfterMs: minutes(5) },
    clock: clock.now,
    ...overrides,
  });
  const httpServer = createServer();
  const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer);
  const joinAttempts = new AttemptLimiter({ maxFailures: 3, windowMs: 60_000, clock: clock.now });
  const gateway = attachRealtimeGateway(io, { registry, joinAttempts });
  await new Promise<void>((resolve) => httpServer.listen(0, '127.0.0.1', resolve));
  const { port } = httpServer.address() as AddressInfo;
  const url = `http://127.0.0.1:${port}`;
  const clients: TestClient[] = [];

  return {
    url,
    clock,
    gateway,
    async connect() {
      const socket: ClientSocket = connectClient(url, {
        transports: ['websocket'],
        forceNew: true,
      });
      await new Promise<void>((resolve, reject) => {
        socket.once('connect', resolve);
        socket.once('connect_error', reject);
      });
      const client = new TestClient(socket);
      clients.push(client);
      return client;
    },
    async close() {
      clients.forEach((client) => client.disconnect());
      await io.close();
    },
  };
}

/** Wiederholt die Prüfung, bis sie zutrifft – Broadcasts kommen asynchron an. */
export async function eventually(check: () => boolean, timeoutMs = 2000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (!check()) {
    if (Date.now() > deadline) throw new Error('Bedingung wurde nicht rechtzeitig erfüllt');
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
}
