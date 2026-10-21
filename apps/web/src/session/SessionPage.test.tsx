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

    expect(await screen.findByRole('alert')).toHaveTextContent('Zu diesem Code gibt es keine Session');
    await user.click(screen.getByRole('button', { name: 'Zur Startseite' }));
    expect(history.at(-1)).toBe('/');
  });

  it('meldet, wenn die Session wegen Inaktivität geschlossen wurde', async () => {
    saveProfile(alice);
    const { client } = renderSessionPage();
    client.pushState(buildView());

    client.pushClosed('expired');

    expect(await screen.findByRole('alert')).toHaveTextContent('längere Zeit niemand etwas getan');
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
