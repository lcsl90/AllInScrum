import { describe, expect, it } from 'vitest';
import { FakeClock, minutes, seconds } from '../../test/support/fake-clock.ts';
import { DEFAULT_DECK } from '../domain/deck.ts';
import {
  type OpenSessionCommand,
  SessionRegistry,
  type RegistrySettings,
} from './session-registry.ts';

function createRegistry(overrides: Partial<RegistrySettings> = {}) {
  return new SessionRegistry({
    deck: DEFAULT_DECK,
    maxSessions: 100,
    maxPlayersPerSession: 16,
    sessionIdleTimeoutMs: minutes(60),
    presence: { adminHandoverAfterMs: seconds(30), removeOfflineAfterMs: minutes(5) },
    clock: new FakeClock().now,
    ...overrides,
  });
}

const alice = { name: 'Alice', avatar: null };

function open(registry: SessionRegistry, command: Partial<OpenSessionCommand> = {}) {
  return registry.open({ name: 'Team A', host: alice, ...command });
}

describe('SessionRegistry', () => {
  it('eröffnet eine Session unter einem neuen Join-Code', () => {
    const registry = createRegistry();

    const { session } = open(registry, { name: 'Sprint 42' });

    expect(session.joinCode).toMatch(/^[A-Z2-9]{3}-[A-Z2-9]{3}$/);
    expect(registry.get(session.joinCode).name).toBe('Sprint 42');
  });

  it('findet die Session auch, wenn der Code klein oder ohne Bindestrich eingegeben wird', () => {
    const registry = createRegistry();
    const { session } = open(registry);
    const typed = ` ${session.joinCode.replace('-', ' ').toLowerCase()} `;

    expect(registry.get(typed)).toBe(session);
  });

  it.each(['XXX-XXX', 'kein code', ''])('kennt zum Code "%s" keine Session', (code) => {
    const registry = createRegistry();

    expect(() => registry.get(code)).toThrowDomainError('session-not-found');
  });

  it('vergibt jeden Code nur einmal', () => {
    const registry = createRegistry({ maxSessions: 500 });

    const codes = Array.from({ length: 300 }, () => open(registry).session.joinCode);

    expect(new Set(codes).size).toBe(300);
  });

  it('setzt den Gastgeber als Admin an den Tisch', () => {
    const registry = createRegistry();

    const { session, host } = open(registry);

    expect(session.viewFor(host.playerId).players).toEqual([
      expect.objectContaining({ name: 'Alice', isAdmin: true }),
    ]);
  });

  it('lässt nichts zurück, wenn der Gastgeber ungültig ist', () => {
    const registry = createRegistry({ maxSessions: 1 });

    expect(() => open(registry, { host: { name: ' ', avatar: null } })).toThrowDomainError(
      'invalid-name',
    );
    expect(() => open(registry)).not.toThrow();
  });

  it('entfernt Leerzeichen am Rand des Session-Namens', () => {
    const registry = createRegistry();

    expect(open(registry, { name: '  Sprint 42 ' }).session.name).toBe('Sprint 42');
  });

  it.each(['', '   ', 'x'.repeat(41)])('lehnt den Session-Namen "%s" ab', (name) => {
    const registry = createRegistry();

    expect(() => open(registry, { name })).toThrowDomainError('invalid-session-name');
  });

  it('nimmt über die Obergrenze hinaus keine neuen Sessions an', () => {
    const registry = createRegistry({ maxSessions: 1 });
    open(registry, { name: 'Team A' });

    expect(() => open(registry, { name: 'Team B' })).toThrowDomainError('too-many-sessions');
  });

  describe('Aufräumen', () => {
    it('löscht Sessions nach 60 Minuten ohne Aktivität', () => {
      const clock = new FakeClock();
      const registry = createRegistry({ clock: clock.now });
      const { session } = open(registry);
      clock.advance(minutes(61));

      const outcome = registry.sweep();

      expect(outcome.expired).toEqual([session.joinCode]);
      expect(() => registry.get(session.joinCode)).toThrowDomainError('session-not-found');
    });

    it('lässt aktive Sessions in Ruhe', () => {
      const clock = new FakeClock();
      const registry = createRegistry({ clock: clock.now });
      const { session } = open(registry);
      clock.advance(minutes(30));

      expect(registry.sweep()).toEqual({ expired: [], changed: [] });
      expect(registry.get(session.joinCode)).toBe(session);
    });

    it('setzt die Präsenzregeln durch und meldet geänderte Sessions', () => {
      const clock = new FakeClock();
      const registry = createRegistry({ clock: clock.now });
      const { session, host } = open(registry);
      session.join({ profile: { name: 'Bob', avatar: null } });
      session.setOnline(host.playerId, false);
      clock.advance(seconds(31));

      expect(registry.sweep().changed).toEqual([session]);
    });
  });
});
