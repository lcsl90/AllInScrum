import { describe, expect, it } from 'vitest';
import { forwardedClientAddress } from './client-address.ts';

const handshake = (headers: Record<string, string>) =>
  ({ address: '10.0.0.2', headers }) as unknown as Parameters<typeof forwardedClientAddress>[0];

describe('forwardedClientAddress', () => {
  it('nimmt hinter einem Proxy die ursprüngliche Client-Adresse', () => {
    expect(forwardedClientAddress(handshake({ 'x-forwarded-for': '203.0.113.7, 10.0.0.1' }))).toBe(
      '203.0.113.7',
    );
  });

  it('fällt ohne Header auf die Verbindungsadresse zurück', () => {
    expect(forwardedClientAddress(handshake({}))).toBe('10.0.0.2');
  });
});
