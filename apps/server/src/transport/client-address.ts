import type { Handshake } from './realtime-gateway.ts';

/**
 * Hinter einem Reverse Proxy ist die Verbindungsadresse die des Proxys. Die ursprüngliche
 * Client-Adresse steht dann als erster Eintrag in X-Forwarded-For.
 * Nur verwenden, wenn wirklich ein vertrauenswürdiger Proxy davor sitzt (TRUST_PROXY=true).
 */
export function forwardedClientAddress(handshake: Handshake): string {
  const header = handshake.headers['x-forwarded-for'];
  const forwarded = (Array.isArray(header) ? header[0] : header)?.split(',')[0]?.trim();
  return forwarded || handshake.address;
}
