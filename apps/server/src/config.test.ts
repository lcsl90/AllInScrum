import { COFFEE_CARD } from '@allinscrum/protocol';
import { describe, expect, it } from 'vitest';
import { loadConfig } from './config.ts';

describe('loadConfig', () => {
  it('liefert sinnvolle Standardwerte ohne Umgebungsvariablen', () => {
    expect(loadConfig({})).toEqual({
      port: 41400,
      host: '0.0.0.0',
      sessionIdleTimeoutMs: 60 * 60_000,
      adminHandoverAfterMs: 30_000,
      removeOfflineAfterMs: 5 * 60_000,
      maxSessions: 200,
      maxPlayersPerSession: 16,
      deck: ['0', '1', '2', '3', '5', '8', '13', '21', '34', '?', COFFEE_CARD],
      trustProxy: false,
      tls: null,
    });
  });

  it.each([
    ['true', true],
    ['1', true],
    ['false', false],
  ])('vertraut dem Reverse Proxy bei TRUST_PROXY=%s → %s', (value, expected) => {
    expect(loadConfig({ TRUST_PROXY: value }).trustProxy).toBe(expected);
  });

  it('spricht HTTPS mit Zertifikat und Schlüssel aus der Umgebung', () => {
    const config = loadConfig({ TLS_CERT_FILE: '/certs/cert.pem', TLS_KEY_FILE: '/certs/key.pem' });

    expect(config.tls).toEqual({ certFile: '/certs/cert.pem', keyFile: '/certs/key.pem' });
  });

  it('bleibt bei leeren Zertifikatsangaben bei HTTP', () => {
    expect(loadConfig({ TLS_CERT_FILE: '', TLS_KEY_FILE: ' ' }).tls).toBeNull();
  });

  it.each([
    { TLS_CERT_FILE: '/certs/cert.pem' },
    { TLS_KEY_FILE: '/certs/key.pem' },
    { TLS_CERT_FILE: ' ', TLS_KEY_FILE: '/certs/key.pem' },
  ])('verlangt für HTTPS Zertifikat und Schlüssel gemeinsam: %j', (env) => {
    expect(() => loadConfig(env)).toThrow(/TLS_CERT_FILE und TLS_KEY_FILE/);
  });

  it('übernimmt Werte aus der Umgebung', () => {
    const config = loadConfig({
      PORT: '8080',
      HOST: '127.0.0.1',
      SESSION_IDLE_TIMEOUT_MINUTES: '15',
      ADMIN_HANDOVER_SECONDS: '10',
      OFFLINE_REMOVAL_MINUTES: '2',
      MAX_SESSIONS: '50',
      MAX_PLAYERS_PER_SESSION: '8',
    });

    expect(config).toMatchObject({
      port: 8080,
      host: '127.0.0.1',
      sessionIdleTimeoutMs: 15 * 60_000,
      adminHandoverAfterMs: 10_000,
      removeOfflineAfterMs: 2 * 60_000,
      maxSessions: 50,
      maxPlayersPerSession: 8,
    });
  });

  it.each(['abc', '-1', '0', '1.5', ''])(
    'bricht bei ungültiger Zahl "%s" mit klarer Meldung ab',
    (value) => {
      expect(() => loadConfig({ MAX_SESSIONS: value })).toThrow(/MAX_SESSIONS/);
    },
  );

  it('übernimmt ein eigenes Kartendeck', () => {
    expect(loadConfig({ CARD_DECK: ' XS, S ,M,L,XL, ? ' }).deck).toEqual([
      'XS',
      'S',
      'M',
      'L',
      'XL',
      '?',
    ]);
  });

  it.each(['5', '1,1,2', '1,,2'])('lehnt das Kartendeck "%s" ab', (deck) => {
    expect(() => loadConfig({ CARD_DECK: deck })).toThrow(/CARD_DECK/);
  });
});
