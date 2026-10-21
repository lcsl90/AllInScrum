import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { startTestServer, type TestServer } from './support/realtime-harness.ts';

const profile = (name: string) => ({ name, avatar: null });

describe('Realtime-Protokoll', () => {
  let server: TestServer;

  beforeEach(async () => {
    server = await startTestServer();
  });

  afterEach(async () => {
    await server.close();
  });

  it('eröffnet eine Session, setzt den Ersteller als Admin an den Tisch und nennt ihm den Join-Code', async () => {
    const alice = await server.connect();

    const response = await alice.emit('session:create', {
      sessionName: 'Sprint 42',
      profile: profile('Alice'),
    });

    expect(response).toMatchObject({
      ok: true,
      data: { joinCode: expect.stringMatching(/^\w{3}-\w{3}$/) },
    });
    const view = await alice.viewWhere((v) => v.players.length === 1);
    expect(view).toMatchObject({ name: 'Sprint 42', phase: 'lobby' });
    expect(view.players[0]).toMatchObject({ name: 'Alice', isAdmin: true });
  });

  it('setzt Beitretende mit dem Join-Code an den Tisch und zeigt es allen', async () => {
    const { alice, joinCode } = await openSession();
    const bob = await server.connect();

    const response = await bob.emit('session:join', {
      joinCode: joinCode.toLowerCase().replace('-', ' '),
      profile: profile('Bob'),
    });

    expect(response).toMatchObject({ ok: true, data: { joinCode } });
    const names = (view: { players: readonly { name: string }[] }) =>
      view.players.map((p) => p.name);
    expect(names(await alice.viewWhere((v) => v.players.length === 2))).toEqual(['Alice', 'Bob']);
    expect(names(await bob.viewWhere((v) => v.players.length === 2))).toEqual(['Alice', 'Bob']);
  });

  it('meldet unbekannte Codes als Antwort statt abzustürzen', async () => {
    const bob = await server.connect();

    const response = await bob.emit('session:join', {
      joinCode: 'ZZZ-ZZZ',
      profile: profile('Bob'),
    });

    expect(response).toEqual({ ok: false, error: 'session-not-found' });
  });

  it('sperrt vorübergehend, wer zu viele falsche Codes durchprobiert', async () => {
    const { joinCode } = await openSession();
    const mallory = await server.connect();
    const tryCode = (code: string) =>
      mallory.emit('session:join', { joinCode: code, profile: profile('Mallory') });

    for (const code of ['AAA-AAA', 'BBB-BBB', 'CCC-CCC']) await tryCode(code);

    expect(await tryCode(joinCode)).toEqual({ ok: false, error: 'too-many-attempts' });
    server.clock.advance(61_000);
    expect(await tryCode(joinCode)).toMatchObject({ ok: true });
  });

  it.each([
    ['session:create', null],
    ['session:create', { sessionName: 42, profile: profile('Eve') }],
    ['session:join', { joinCode: 'ABC-DEF', profile: { name: ['Eve'], avatar: null } }],
    ['session:join', { joinCode: 123456, profile: profile('Eve') }],
  ])('weist manipulierte Daten für %s ab: %j', async (event, payload) => {
    const eve = await server.connect();

    expect(await eve.emitUntyped(event, payload)).toEqual({ ok: false, error: 'invalid-payload' });
  });

  it('übersteht Events ohne Antwort-Callback', async () => {
    const eve = await server.connect();
    const request = { joinCode: 'ZZZ-ZZZ', profile: profile('Eve') };

    (eve.socket.emit as (event: string, payload: unknown) => void)('session:join', request);

    expect(await eve.emit('session:join', request)).toEqual({
      ok: false,
      error: 'session-not-found',
    });
  });

  describe('Schätzrunde', () => {
    it('hält Karten bis zum Aufdecken geheim und zeigt sie danach allen', async () => {
      const { alice, bob } = await tableWithAliceAndBob();

      expect(await alice.emit('round:start')).toEqual({ ok: true, data: null });
      await alice.emit('round:vote', '3');
      await bob.emit('round:vote', '8');

      const beforeReveal = await alice.viewWhere((v) =>
        v.players.every((p) => p.status === 'voted'),
      );
      expect(beforeReveal.players.map((p) => p.card)).toEqual(['3', null]);

      await alice.emit('round:reveal');

      const afterReveal = await bob.viewWhere((v) => v.phase === 'revealed');
      expect(afterReveal.players.map((p) => p.card)).toEqual(['3', '8']);
      expect(afterReveal.result?.suggestedCard).toBe('5');
    });

    it('zeigt allen, wenn jemand unsicher ist', async () => {
      const { alice, bob, bobMembership } = await tableWithAliceAndBob();
      await alice.emit('round:start');

      await bob.emit('round:uncertain', true);

      const view = await alice.viewWhere((v) => v.players.some((p) => p.uncertain));
      expect(view.players.find((p) => p.uncertain)?.id).toBe(bobMembership.playerId);
    });

    it('lässt den Admin einen Spieler aussetzen', async () => {
      const { alice, bob, bobMembership } = await tableWithAliceAndBob();
      await alice.emit('round:start');

      await alice.emit('round:ignore', { playerId: bobMembership.playerId, ignored: true });

      const view = await bob.viewWhere((v) => v.players.some((p) => p.status === 'ignored'));
      expect(view.players[1]?.status).toBe('ignored');
    });

    it('lässt jeden sich selbst als Zuschauer aus der Schätzung nehmen', async () => {
      const { alice, bob, bobMembership } = await tableWithAliceAndBob();

      expect(await bob.emit('player:spectate', true)).toEqual({ ok: true, data: null });

      const view = await alice.viewWhere((v) => v.players.some((p) => p.isSpectator));
      expect(view.players.find((p) => p.isSpectator)?.id).toBe(bobMembership.playerId);
    });

    it('lässt den Admin seine Rolle übergeben', async () => {
      const { alice, bob, bobMembership } = await tableWithAliceAndBob();

      await alice.emit('admin:transfer', bobMembership.playerId);

      const view = await bob.viewWhere((v) => v.players[1]?.isAdmin === true);
      expect(view.canStart).toBe(true);
    });
  });

  describe('Verlassen und Wiederkommen', () => {
    it('entfernt Spieler, die den Tisch verlassen', async () => {
      const { alice, bob } = await tableWithAliceAndBob();

      expect(await bob.emit('session:leave')).toEqual({ ok: true, data: null });

      await alice.viewWhere((v) => v.players.length === 1);
      expect(await bob.emit('round:vote', '5')).toEqual({ ok: false, error: 'not-a-member' });
    });

    it('zeigt getrennte Spieler als offline', async () => {
      const { alice, bob } = await tableWithAliceAndBob();

      bob.disconnect();

      await alice.viewWhere((v) => v.players[1]?.isOnline === false);
    });

    it('setzt Wiederkehrende nach einem Reload auf ihren alten Platz', async () => {
      const { alice, bob, joinCode, bobMembership } = await tableWithAliceAndBob();
      bob.disconnect();
      await alice.viewWhere((v) => v.players[1]?.isOnline === false);

      const bobAgain = await server.connect();
      const response = await bobAgain.emit('session:join', {
        joinCode,
        profile: profile('Bob'),
        resumeToken: bobMembership.resumeToken,
      });

      expect(response).toMatchObject({ ok: true, data: { playerId: bobMembership.playerId } });
      const view = await alice.viewWhere((v) => v.players[1]?.isOnline === true);
      expect(view.players).toHaveLength(2);
    });

    it('bleibt online, solange noch ein zweiter Tab offen ist', async () => {
      const { alice, bob, joinCode, bobMembership } = await tableWithAliceAndBob();
      const secondTab = await server.connect();
      await secondTab.emit('session:join', {
        joinCode,
        profile: profile('Bob'),
        resumeToken: bobMembership.resumeToken,
      });

      bob.disconnect();
      await alice.emit('round:start');

      const view = await alice.viewWhere((v) => v.phase === 'voting');
      expect(view.players[1]?.isOnline).toBe(true);
    });

    it('zeigt einen Spieler in der alten Session als offline, wenn er die Session wechselt', async () => {
      const { alice, bob } = await tableWithAliceAndBob();

      await bob.emit('session:create', { sessionName: 'Andere Runde', profile: profile('Bob') });

      await alice.viewWhere((v) => v.players[1]?.isOnline === false);
    });
  });

  describe('Aufräumen', () => {
    it('schließt inaktive Sessions und informiert alle am Tisch', async () => {
      const { alice, bob } = await tableWithAliceAndBob();
      server.clock.advance(61 * 60_000);

      await server.gateway.sweep();

      expect(await alice.closed()).toBe('expired');
      expect(await bob.closed()).toBe('expired');
      expect(await alice.emit('round:start')).toEqual({ ok: false, error: 'not-a-member' });
    });

    it('verteilt Änderungen durch die Präsenzregeln', async () => {
      const { alice, bob } = await tableWithAliceAndBob();
      alice.disconnect();
      await bob.viewWhere((v) => v.players[0]?.isOnline === false);
      server.clock.advance(31_000);

      await server.gateway.sweep();

      await bob.viewWhere((v) => v.players[1]?.isAdmin === true);
    });
  });

  async function openSession() {
    const alice = await server.connect();
    const response = await alice.emit('session:create', {
      sessionName: 'Sprint 42',
      profile: profile('Alice'),
    });
    if (!response.ok) throw new Error(`Session konnte nicht erstellt werden: ${response.error}`);
    await alice.viewWhere(() => true);
    return { alice, joinCode: response.data.joinCode };
  }

  async function tableWithAliceAndBob() {
    const { alice, joinCode } = await openSession();
    const bob = await server.connect();
    const joined = await bob.emit('session:join', { joinCode, profile: profile('Bob') });
    if (!joined.ok) throw new Error(`Bob konnte nicht beitreten: ${joined.error}`);
    await alice.viewWhere((v) => v.players.length === 2);
    return { alice, bob, joinCode, bobMembership: joined.data };
  }
});
