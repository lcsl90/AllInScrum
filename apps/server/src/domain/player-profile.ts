import type { ProfileInput } from '@allinscrum/protocol';
import { DomainError } from './domain-error.ts';

export const MAX_NAME_LENGTH = 24;
/**
 * Der Browser speichert das Foto in einem Cookie (max. ~4 kB) und verkleinert es entsprechend.
 * Der Puffer darüber fängt Abweichungen ab; mehr ist nicht nötig, denn jeder Avatar wird bei jedem
 * Broadcast an alle Spieler gesendet.
 */
export const MAX_AVATAR_LENGTH = 6_000;

export interface PlayerProfile {
  readonly name: string;
  readonly avatar: string | null;
}

/** Normalisiert und prüft Name und Avatar, wie sie vom Client kommen. */
export function parseProfile(input: ProfileInput): PlayerProfile {
  return { name: parseName(input.name), avatar: parseAvatar(input.avatar) };
}

const IMAGE_DATA_URL = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/;

function parseAvatar(raw: string | null): string | null {
  if (raw === null) return null;
  if (raw.length > MAX_AVATAR_LENGTH || !IMAGE_DATA_URL.test(raw)) {
    throw new DomainError('invalid-avatar');
  }
  return raw;
}

function parseName(raw: string): string {
  const name = raw.trim();
  if (name.length === 0 || name.length > MAX_NAME_LENGTH) throw new DomainError('invalid-name');
  return name;
}
