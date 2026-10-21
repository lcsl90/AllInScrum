import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ClientToServerEvents, ServerToClientEvents } from '@allinscrum/protocol';
import { Server } from 'socket.io';
import { AttemptLimiter } from './application/attempt-limiter.ts';
import { SessionRegistry } from './application/session-registry.ts';
import { loadConfig } from './config.ts';
import { systemClock } from './domain/clock.ts';
import { createHttpServer } from './http/http-server.ts';
import { forwardedClientAddress } from './transport/client-address.ts';
import { attachRealtimeGateway } from './transport/realtime-gateway.ts';

/** Composition Root: der einzige Ort, an dem die Bausteine zusammengesteckt werden. */

const SWEEP_INTERVAL_MS = 5_000;
/** Reicht für ein Profil mit Avatar (≤ 6 kB) und schützt vor übergroßen Nachrichten. */
const MAX_MESSAGE_BYTES = 32 * 1024;
/** Genug für Vertipper, zu wenig, um 887 Mio. Codes durchzuprobieren. */
const MAX_FAILED_JOINS_PER_MINUTE = 10;

const config = loadConfig(process.env);

const registry = new SessionRegistry({
  deck: config.deck,
  maxSessions: config.maxSessions,
  maxPlayersPerSession: config.maxPlayersPerSession,
  sessionIdleTimeoutMs: config.sessionIdleTimeoutMs,
  presence: {
    adminHandoverAfterMs: config.adminHandoverAfterMs,
    removeOfflineAfterMs: config.removeOfflineAfterMs,
  },
  clock: systemClock,
});

// Sowohl src/main.ts (Entwicklung) als auch dist/main.js (Build) liegen zwei Ebenen unter apps/.
const defaultStaticDir = resolve(dirname(fileURLToPath(import.meta.url)), '../../web/dist');
const httpServer = createHttpServer({
  staticDir: process.env['STATIC_DIR'] ?? defaultStaticDir,
  tls: config.tls
    ? { cert: readFileSync(config.tls.certFile), key: readFileSync(config.tls.keyFile) }
    : undefined,
});

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  serveClient: false,
  maxHttpBufferSize: MAX_MESSAGE_BYTES,
});
const gateway = attachRealtimeGateway(io, {
  registry,
  joinAttempts: new AttemptLimiter({
    maxFailures: MAX_FAILED_JOINS_PER_MINUTE,
    windowMs: 60_000,
    clock: systemClock,
  }),
  ...(config.trustProxy && { clientAddress: forwardedClientAddress }),
});

const sweepTimer = setInterval(() => void gateway.sweep(), SWEEP_INTERVAL_MS);

httpServer.listen(config.port, config.host, () => {
  const scheme = config.tls ? 'https' : 'http';
  console.log(`AllInScrum läuft auf ${scheme}://${config.host}:${config.port}`);
});

function shutdown(signal: string): void {
  console.log(`${signal} empfangen – fahre herunter.`);
  clearInterval(sweepTimer);
  void io.close(() => process.exit(0));
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
