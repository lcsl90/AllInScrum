import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { saveProfile } from '../profile/profile-cookie.ts';
import { renderApp } from '../test/render-app.tsx';
import { HomePage } from './HomePage.tsx';

describe('Startseite', () => {
  it('lässt erst mitmachen, wenn ein Name eingetragen ist', async () => {
    const { user } = renderApp(<HomePage />);
    const create = screen.getByRole('button', { name: 'Session erstellen' });
    const join = screen.getByRole('button', { name: 'Session beitreten' });
    expect(create).toBeDisabled();
    expect(join).toBeDisabled();

    await user.type(screen.getByLabelText('Dein Name'), 'Alice');

    expect(create).toBeEnabled();
    expect(join).toBeEnabled();
  });

  it('füllt den gemerkten Namen beim nächsten Besuch vor', () => {
    saveProfile({ name: 'Alice', avatar: null });

    renderApp(<HomePage />);

    expect(screen.getByLabelText('Dein Name')).toHaveValue('Alice');
  });

  it('eröffnet eine Session und führt direkt an den Tisch', async () => {
    saveProfile({ name: 'Alice', avatar: null });
    const { user, client, history } = renderApp(<HomePage />);
    client.respond('createSession', {
      ok: true,
      data: { joinCode: 'K7Q-X2M', playerId: 'me', resumeToken: 'token' },
    });

    await user.click(screen.getByRole('button', { name: 'Session erstellen' }));
    expect(screen.getByLabelText('Name der Session')).toHaveValue('Alices Runde');
    await user.click(screen.getByRole('button', { name: 'Tisch eröffnen' }));

    expect(client.callsOf('createSession')).toEqual([
      [{ sessionName: 'Alices Runde', profile: { name: 'Alice', avatar: null } }],
    ]);
    expect(history.at(-1)).toBe('/s/K7Q-X2M');
  });

  it('führt mit dem Join-Code an den Tisch', async () => {
    saveProfile({ name: 'Bob', avatar: null });
    const { user, history } = renderApp(<HomePage />);

    await user.click(screen.getByRole('button', { name: 'Session beitreten' }));
    await user.type(screen.getByLabelText('Join-Code'), 'k7qx2m');
    await user.click(screen.getByRole('button', { name: 'Beitreten' }));

    expect(history.at(-1)).toBe('/s/K7Q-X2M');
  });
});
