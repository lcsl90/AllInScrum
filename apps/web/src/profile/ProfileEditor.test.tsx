import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderApp } from '../test/render-app.tsx';
import { avatarFromFile } from './avatar-image.ts';
import { loadProfile, saveProfile } from './profile-cookie.ts';
import { ProfileEditor } from './ProfileEditor.tsx';

// Canvas-Bildverarbeitung ist eine Browser-Grenze, die jsdom nicht kann.
vi.mock('./avatar-image.ts', () => ({ avatarFromFile: vi.fn() }));

const PHOTO = 'data:image/webp;base64,UklGRg==';
const photoFile = () => new File(['binär'], 'ich.png', { type: 'image/png' });

describe('Profil bearbeiten', () => {
  beforeEach(() => {
    saveProfile({ name: 'Alice', avatar: null });
    vi.mocked(avatarFromFile).mockResolvedValue(PHOTO);
  });

  it('übernimmt ein hochgeladenes Foto als Avatar und merkt es sich', async () => {
    const { user } = renderApp(<ProfileEditor />);

    await user.upload(screen.getByLabelText('Foto hochladen'), photoFile());

    expect(await screen.findByRole('img', { name: 'Alice' })).toHaveAttribute('src', PHOTO);
    expect(loadProfile().avatar).toBe(PHOTO);
  });

  it('kehrt nach dem Entfernen des Fotos zu den Initialen zurück', async () => {
    saveProfile({ name: 'Alice', avatar: PHOTO });
    const { user } = renderApp(<ProfileEditor />);

    await user.click(screen.getByRole('button', { name: 'Foto entfernen' }));

    expect(screen.getByRole('img', { name: 'Alice' })).toHaveTextContent('A');
    expect(loadProfile().avatar).toBeNull();
  });

  it('erklärt, wenn ein Bild nicht verwendet werden kann', async () => {
    vi.mocked(avatarFromFile).mockRejectedValue(new Error('kein Bild'));
    const { user } = renderApp(<ProfileEditor />);

    await user.upload(screen.getByLabelText('Foto hochladen'), photoFile());

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Dieses Bild konnte nicht verwendet werden',
    );
  });
});
