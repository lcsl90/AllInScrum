import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { saveProfile } from '../profile/profile-cookie.ts';
import { rememberMembership } from '../realtime/membership-store.ts';
import { buildView } from '../test/builders.ts';
import { FakeSessionClient } from '../test/fake-session-client.ts';
import { renderApp } from '../test/render-app.tsx';
import { SessionPage } from './SessionPage.tsx';

const alice = { name: 'Alice', avatar: null };

function renderSessionPage() {
  return renderApp(<SessionPage joinCode="K7Q-X2M" />, { path: '/s/K7Q-X2M' });
}

/** Wie im echten Betrieb: Der Beitritt ist bestätigt, bevor der Server den Tisch schließen kann. */
async function renderSeatedSessionPage() {
  saveProfile(alice);
  const rendered = renderSessionPage();
  rendered.client.pushState(buildView({ name: 'Sprint 42' }));
  await screen.findByRole('heading', { name: 'Sprint 42' });
  return rendered;
}

describe('Session-Seite', () => {
  it('setzt sich mit gemerktem Namen automatisch an den Tisch', async () => {
    saveProfile(alice);
    const { client } = renderSessionPage();

    expect(client.callsOf('joinSession')).toEqual([
      [{ joinCode: 'K7Q-X2M', profile: alice, resumeToken: undefined }],
    ]);
    client.pushState(buildView({ name: 'Sprint 42' }));
    expect(await screen.findByRole('heading', { name: 'Sprint 42' })).toBeInTheDocument();
  });

  it('fragt Gäste ohne gemerkten Namen erst, wie sie heißen', async () => {
    const { client, user } = renderSessionPage();
    expect(client.callsOf('joinSession')).toEqual([]);

    await user.type(screen.getByLabelText('Dein Name'), 'Eve');
    await user.click(screen.getByRole('button', { name: 'Platz nehmen' }));

    expect(client.callsOf('joinSession')).toEqual([
      [expect.objectContaining({ profile: { name: 'Eve', avatar: null } })],
    ]);
  });

  it('kehrt nach einem Reload auf den gemerkten Platz zurück', () => {
    saveProfile(alice);
    rememberMembership('K7Q-X2M', 'mein-geheimnis');

    const { client } = renderSessionPage();

    expect(client.callsOf('joinSession')[0]?.[0]).toMatchObject({ resumeToken: 'mein-geheimnis' });
  });

  it('erklärt, wenn es zum Code keine Session gibt, und führt zurück zur Startseite', async () => {
    saveProfile(alice);
    const client = new FakeSessionClient();
    client.respond('joinSession', { ok: false, error: 'session-not-found' });
    const { user, history } = renderApp(<SessionPage joinCode="K7Q-X2M" />, { client });

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Zu diesem Code gibt es keine Session',
    );
    await user.click(screen.getByRole('button', { name: 'Zur Startseite' }));
    expect(history.at(-1)).toBe('/');
  });

  it.each([
    ['session-not-found', 'Tisch nicht gefunden'],
    ['session-full', 'Kein Platz frei'],
    ['too-many-attempts', 'Beitritt nicht möglich'],
  ] as const)('betitelt den Fehler %s passend: %s', async (error, title) => {
    saveProfile(alice);
    const client = new FakeSessionClient();
    client.respond('joinSession', { ok: false, error });
    renderApp(<SessionPage joinCode="K7Q-X2M" />, { client });

    expect(await screen.findByRole('heading', { name: title })).toBeInTheDocument();
  });

  it('meldet, wenn die Session wegen Inaktivität geschlossen wurde', async () => {
    const { client } = await renderSeatedSessionPage();

    client.pushClosed('expired');

    expect(await screen.findByRole('heading', { name: 'Tisch abgeräumt' })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('längere Zeit niemand etwas getan');
  });

  it('erklärt, dass der Admin einen vom Tisch genommen hat', async () => {
    const { client } = await renderSeatedSessionPage();

    client.pushClosed('removed');

    expect(await screen.findByRole('heading', { name: 'Vom Tisch genommen' })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Der Admin hat dich vom Tisch genommen');
  });

  it('setzt einen Entfernten nach einem Verbindungsabbruch nicht heimlich wieder hin', async () => {
    const { client } = await renderSeatedSessionPage();
    client.pushClosed('removed');
    const joinsBefore = client.callsOf('joinSession').length;

    client.pushConnection(false);
    client.pushConnection(true);

    expect(client.callsOf('joinSession')).toHaveLength(joinsBefore);
  });

  it('setzt sich nach einem Verbindungsabbruch automatisch wieder auf den Platz', async () => {
    saveProfile(alice);
    const { client } = renderSessionPage();
    client.pushState(buildView());
    await screen.findByRole('heading', { name: 'Sprint 42' });

    client.pushConnection(false);
    client.pushConnection(true);

    await waitFor(() => expect(client.callsOf('joinSession')).toHaveLength(2));
    expect(client.callsOf('joinSession')[1]?.[0]).toMatchObject({ resumeToken: 'token-me' });
  });
});
