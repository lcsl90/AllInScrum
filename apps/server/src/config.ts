import type { Card } from '@allinscrum/protocol';
import { DEFAULT_DECK } from './domain/deck.ts';

export interface AppConfig {
  readonly port: number;
  readonly host: string;
  readonly sessionIdleTimeoutMs: number;
  readonly adminHandoverAfterMs: number;
  readonly removeOfflineAfterMs: number;
  readonly maxSessions: number;
  readonly maxPlayersPerSession: number;
  readonly deck: readonly Card[];
  /** Hinter einem Reverse Proxy: Client-Adresse aus X-Forwarded-For lesen. */
  readonly trustProxy: boolean;
  /** Zertifikat und Schlüssel (PEM-Dateien) – dann spricht der Server HTTPS, sonst HTTP. */
  readonly tls: TlsFiles | null;
}

export interface TlsFiles {
  readonly certFile: string;
  readonly keyFile: string;
}

type Environment = Readonly<Record<string, string | undefined>>;

const SECOND = 1000;
const MINUTE = 60 * SECOND;

/** Liest die Konfiguration aus Umgebungsvariablen (siehe README/docker-compose.yml). */
export function loadConfig(env: Environment): AppConfig {
  const number = (name: string, fallback: number) => readNumber(env, name, fallback);
  return {
    port: number('PORT', 41400),
    host: env['HOST'] ?? '0.0.0.0',
    sessionIdleTimeoutMs: number('SESSION_IDLE_TIMEOUT_MINUTES', 60) * MINUTE,
    adminHandoverAfterMs: number('ADMIN_HANDOVER_SECONDS', 30) * SECOND,
    removeOfflineAfterMs: number('OFFLINE_REMOVAL_MINUTES', 5) * MINUTE,
    maxSessions: number('MAX_SESSIONS', 200),
    maxPlayersPerSession: number('MAX_PLAYERS_PER_SESSION', 16),
    deck: readDeck(env, 'CARD_DECK', DEFAULT_DECK),
    trustProxy: ['true', '1'].includes(env['TRUST_PROXY']?.trim().toLowerCase() ?? ''),
    tls: readTls(env),
  };
}

/**
 * HTTPS gibt es nur mit beiden Dateien – eine allein ist ein Konfigurationsfehler, kein stilles HTTP.
 * Leere Werte gelten als nicht gesetzt (docker-compose reicht ungesetzte Variablen leer durch).
 */
function readTls(env: Environment): TlsFiles | null {
  const certFile = env['TLS_CERT_FILE']?.trim();
  const keyFile = env['TLS_KEY_FILE']?.trim();
  if (!certFile && !keyFile) return null;
  if (!certFile || !keyFile) {
    throw new Error(
      'Ungültige Konfiguration: Für HTTPS braucht es TLS_CERT_FILE und TLS_KEY_FILE (Pfade zu PEM-Dateien).',
    );
  }
  return { certFile, keyFile };
}

/** Kommagetrennte Kartenwerte, z. B. "1,2,3,5,8,?". Mindestens zwei, keine doppelten, keine leeren. */
function readDeck(env: Environment, name: string, fallback: readonly Card[]): readonly Card[] {
  const raw = env[name];
  if (raw === undefined) return fallback;
  const cards = raw.split(',').map((card) => card.trim());
  const valid = cards.length >= 2 && cards.every(Boolean) && new Set(cards).size === cards.length;
  if (!valid) {
    throw new Error(
      `Ungültige Konfiguration: ${name}="${raw}" braucht mindestens zwei eindeutige, kommagetrennte Karten.`,
    );
  }
  return cards;
}

/** Alle Zahlenwerte sind positive Ganzzahlen; alles andere ist ein Konfigurationsfehler. */
function readNumber(env: Environment, name: string, fallback: number): number {
  const raw = env[name];
  if (raw === undefined) return fallback;
  const value = Number(raw);
  if (raw.trim() === '' || !Number.isInteger(value) || value <= 0) {
    throw new Error(`Ungültige Konfiguration: ${name}="${raw}" muss eine positive Ganzzahl sein.`);
  }
  return value;
}
