import { describe, expect, it } from 'vitest';
import { days, FakeClock, minutes, seconds } from '../../test/support/fake-clock.ts';
import { DEFAULT_DECK } from '../domain/deck.ts';
import type { SessionSnapshot } from '../domain/session.ts';
import { SessionArchive, type SessionStore } from './session-archive.ts';
import { SessionRegistry } from './session-registry.ts';

/** Ersetzt die Festplatte: merkt sich, was gespeichert wurde. */
class InMemoryStore implements SessionStore {
  saved: (readonly SessionSnapshot[])[] = [];
  private stored: readonly SessionSnapshot[];

  constructor(stored: readonly SessionSnapshot[] = []) {
    this.stored = stored;
  }

  load(): Promise<readonly SessionSnapshot[]> {
    return Promise.resolve(this.stored);
  }

  save(snapshots: readonly SessionSnapshot[]): Promise<void> {
    this.saved.push(snapshots);
    this.stored = snapshots;
    return Promise.resolve();
  }
}

function createRegistry(clock = new FakeClock()) {
  return new SessionRegistry({
    deck: DEFAULT_DECK,
    maxSessions: 100,
    maxPlayersPerSession: 16,
    sessionRetentionMs: days(28),
    presence: { adminHandoverAfterMs: seconds(30), removeOfflineAfterMs: minutes(5) },
    clock: clock.now,
  });
}

const alice = { name: 'Alice', avatar: null };

describe('SessionArchive', () => {
  it('stellt gespeicherte Tische nach einem Neustart wieder her', async () => {
    const before = createRegistry();
    const { session } = before.open({ name: 'Team Rot', host: alice });
    const store = new InMemoryStore();
    await new SessionArchive(before, store).flush();

    const after = createRegistry();
    await new SessionArchive(after, store).restore();

    expect(after.get(session.joinCode).name).toBe('Team Rot');
  });

  it('speichert, sobald sich an einem Tisch etwas geändert hat', async () => {
    const registry = createRegistry();
    const store = new InMemoryStore();
    const archive = new SessionArchive(registry, store);
    const { session, host } = registry.open({ name: 'Team Rot', host: alice });
    await archive.flush();

    session.setReferenceStory(host.playerId, { title: 'Login', card: '5' });
    await archive.flush();

    expect(store.saved).toHaveLength(2);
    expect(store.saved[1]?.[0]?.referenceStory).toEqual({ title: 'Login', card: '5' });
  });

  it('schreibt nicht erneut, solange sich nichts geändert hat', async () => {
    const registry = createRegistry();
    const store = new InMemoryStore();
    const archive = new SessionArchive(registry, store);
    registry.open({ name: 'Team Rot', host: alice });

    await archive.flush();
    await archive.flush();

    expect(store.saved).toHaveLength(1);
  });

  it('schreibt das Wiederhergestellte nicht gleich wieder zurück', async () => {
    const before = createRegistry();
    before.open({ name: 'Team Rot', host: alice });
    const store = new InMemoryStore(before.snapshot());

    const archive = new SessionArchive(createRegistry(), store);
    await archive.restore();
    await archive.flush();

    expect(store.saved).toEqual([]);
  });

  it('vergisst auch gelöschte Tische dauerhaft', async () => {
    const clock = new FakeClock();
    const registry = createRegistry(clock);
    const store = new InMemoryStore();
    const archive = new SessionArchive(registry, store);
    registry.open({ name: 'Team Rot', host: alice });
    await archive.flush();

    clock.advance(days(29));
    registry.sweep();
    await archive.flush();

    expect(store.saved.at(-1)).toEqual([]);
  });

  it('schreibt nie zwei Stände gleichzeitig, auch wenn das Speichern dauert', async () => {
    let writing = 0;
    let overlapped = false;
    const slowStore: SessionStore = {
      load: () => Promise.resolve([]),
      async save() {
        writing += 1;
        overlapped ||= writing > 1;
        await new Promise((resolve) => setTimeout(resolve, 5));
        writing -= 1;
      },
    };
    const registry = createRegistry();
    const archive = new SessionArchive(registry, slowStore);
    registry.open({ name: 'Team Rot', host: alice });
    const first = archive.flush();
    registry.open({ name: 'Team Blau', host: alice });

    await Promise.all([first, archive.flush()]);

    expect(overlapped).toBe(false);
  });

  it('versucht es beim nächsten Mal erneut, wenn das Speichern scheitert', async () => {
    let attempts = 0;
    const flakyStore: SessionStore = {
      load: () => Promise.resolve([]),
      save() {
        attempts += 1;
        return attempts === 1 ? Promise.reject(new Error('Platte voll')) : Promise.resolve();
      },
    };
    const registry = createRegistry();
    const archive = new SessionArchive(registry, flakyStore);
    registry.open({ name: 'Team Rot', host: alice });

    await expect(archive.flush()).rejects.toThrow('Platte voll');
    await archive.flush();

    expect(attempts).toBe(2);
  });
});
