// @vitest-environment node
import type { SessionView } from '@allinscrum/protocol';
import { io } from 'socket.io-client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  eventually,
  startTestServer,
  type TestServer,
} from '../../../server/test/support/realtime-harness.ts';
import { createSessionClient, type SessionClient } from './session-client.ts';

/** Vertragstest: Der Web-Client spricht das Protokoll des echten Servers. */
describe('SessionClient gegen den echten Server', () => {
  let server: TestServer;
  const clients: SessionClient[] = [];

  beforeEach(async () => {
    server = await startTestServer();
  });

  afterEach(async () => {
    clients.splice(0).forEach((client) => client.dispose());
    await server.close();
  });

  function connectClient(): SessionClient {
    const client = createSessionClient(
      io(server.url, { transports: ['websocket'], forceNew: true }),
    );
    clients.push(client);
    return client;
  }

  it('eröffnet eine Session, lässt andere per Code beitreten und verteilt den Tisch', async () => {
    const host = connectClient();
    const guest = connectClient();
    const guestViews: SessionView[] = [];
    guest.onState((view) => guestViews.push(view));

    const created = await host.createSession({
      sessionName: 'Sprint 42',
      profile: { name: 'Alice', avatar: null },
    });
    if (!created.ok) throw new Error(created.error);
    const joined = await guest.joinSession({
      joinCode: created.data.joinCode,
      profile: { name: 'Bob', avatar: null },
    });

    expect(joined.ok).toBe(true);
    await eventually(() => guestViews.at(-1)?.players.length === 2);
    expect(guestViews.at(-1)?.joinCode).toBe(created.data.joinCode);
  });

  it('nimmt sich als Zuschauer aus der Schätzung', async () => {
    const host = connectClient();
    const hostViews: SessionView[] = [];
    host.onState((view) => hostViews.push(view));
    await host.createSession({
      sessionName: 'Sprint 42',
      profile: { name: 'Alice', avatar: null },
    });

    expect(await host.setSpectating(true)).toEqual({ ok: true, data: null });
    await eventually(() => hostViews.at(-1)?.players[0]?.isSpectator === true);
  });

  it('hinterlegt als Admin eine Referenzstory für alle', async () => {
    const host = connectClient();
    const hostViews: SessionView[] = [];
    host.onState((view) => hostViews.push(view));
    await host.createSession({
      sessionName: 'Sprint 42',
      profile: { name: 'Alice', avatar: null },
    });

    const response = await host.setReferenceStory({ title: 'Login', card: '5' });

    expect(response).toEqual({ ok: true, data: null });
    await eventually(() => hostViews.at(-1)?.referenceStory?.title === 'Login');
  });

  it('nimmt als Admin einen Spieler vom Tisch – der erfährt es sofort', async () => {
    const host = connectClient();
    const guest = connectClient();
    const closedReasons: string[] = [];
    guest.onClosed((reason) => closedReasons.push(reason));
    const created = await host.createSession({
      sessionName: 'Sprint 42',
      profile: { name: 'Alice', avatar: null },
    });
    if (!created.ok) throw new Error(created.error);
    const joined = await guest.joinSession({
      joinCode: created.data.joinCode,
      profile: { name: 'Bob', avatar: null },
    });
    if (!joined.ok) throw new Error(joined.error);

    const removed = await host.removePlayer(joined.data.playerId);

    expect(removed).toEqual({ ok: true, data: null });
    await eventually(() => closedReasons.includes('removed'));
  });

  it('meldet einen nicht erreichbaren Server, statt ewig zu warten', async () => {
    const socket = io('http://127.0.0.1:9', { reconnection: false, autoConnect: false });
    const client = createSessionClient(socket, { ackTimeoutMs: 50 });
    clients.push(client);

    expect(await client.startRound()).toEqual({ ok: false, error: 'server-unreachable' });
  });
});
