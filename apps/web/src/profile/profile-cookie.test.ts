import { describe, expect, it } from 'vitest';
import { loadProfile, MAX_AVATAR_DATA_URL_LENGTH, saveProfile } from './profile-cookie.ts';

describe('Profil im Cookie', () => {
  it('ist ohne gespeichertes Profil leer', () => {
    expect(loadProfile()).toEqual({ name: '', avatar: null });
  });

  it('merkt sich den Namen – auch mit Sonderzeichen', () => {
    saveProfile({ name: 'Zoë; Müller=Ü', avatar: null });

    expect(loadProfile().name).toBe('Zoë; Müller=Ü');
  });

  it('merkt sich ein Foto bis zur Cookie-tauglichen Maximalgröße', () => {
    const prefix = 'data:image/webp;base64,';
    const base64 = 'Ab+/'.repeat(1000).slice(0, MAX_AVATAR_DATA_URL_LENGTH - prefix.length - 2) + '==';
    const avatar = prefix + base64;

    saveProfile({ name: 'Alice', avatar });

    expect(avatar).toHaveLength(MAX_AVATAR_DATA_URL_LENGTH);
    expect(loadProfile().avatar).toBe(avatar);
  });

  it('vergisst das Foto, wenn es entfernt wird', () => {
    saveProfile({ name: 'Alice', avatar: 'data:image/jpeg;base64,QUJD' });

    saveProfile({ name: 'Alice', avatar: null });

    expect(loadProfile()).toEqual({ name: 'Alice', avatar: null });
  });
});
