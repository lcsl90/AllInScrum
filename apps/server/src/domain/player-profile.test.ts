import { describe, expect, it } from 'vitest';
import { MAX_AVATAR_LENGTH, MAX_NAME_LENGTH, parseProfile } from './player-profile.ts';

describe('parseProfile', () => {
  it(`akzeptiert Namen bis ${MAX_NAME_LENGTH} Zeichen`, () => {
    const name = 'x'.repeat(MAX_NAME_LENGTH);

    expect(parseProfile({ name, avatar: null }).name).toBe(name);
  });

  it('lehnt zu lange Namen ab', () => {
    const name = 'x'.repeat(MAX_NAME_LENGTH + 1);

    expect(() => parseProfile({ name, avatar: null })).toThrowDomainError('invalid-name');
  });

  it.each([
    'https://example.com/me.png',
    'javascript:alert(1)',
    'data:text/html;base64,PHNjcmlwdD4=',
    'data:image/svg+xml;base64,PHN2Zz4=',
  ])('lehnt den Avatar %s ab', (avatar) => {
    expect(() => parseProfile({ name: 'Alice', avatar })).toThrowDomainError('invalid-avatar');
  });

  it('akzeptiert ein verkleinertes Foto als Data-URL', () => {
    const avatar = 'data:image/webp;base64,UklGRhIAAABXRUJQ';

    expect(parseProfile({ name: 'Alice', avatar }).avatar).toBe(avatar);
  });

  it(`lehnt Fotos über ${MAX_AVATAR_LENGTH} Zeichen ab`, () => {
    const prefix = 'data:image/png;base64,';
    const avatar = prefix + 'A'.repeat(MAX_AVATAR_LENGTH - prefix.length + 1);

    expect(() => parseProfile({ name: 'Alice', avatar })).toThrowDomainError('invalid-avatar');
  });
});
