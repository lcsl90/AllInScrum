export interface StoredProfile {
  readonly name: string;
  readonly avatar: string | null;
}

/**
 * Ein Cookie darf (Name + Wert) höchstens 4096 Bytes groß sein. Mit kompakter Kodierung passt ein
 * Foto-Data-URL bis zu dieser Länge sicher hinein. Die Bildverkleinerung richtet sich danach.
 */
export const MAX_AVATAR_DATA_URL_LENGTH = 4000;

const NAME_COOKIE = 'ais_name';
const AVATAR_COOKIE = 'ais_avatar';
const ONE_YEAR_IN_SECONDS = 365 * 24 * 60 * 60;
const DATA_URL = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+=*)$/;
const COOKIE_AVATAR = /^(png|jpeg|webp)\.([A-Za-z0-9_-]+=*)$/;

/** Liest Name und Foto aus den Cookies. Fehlt etwas, gibt es leere Standardwerte. */
export function loadProfile(): StoredProfile {
  const cookies = readCookies();
  return {
    name: decodeURIComponent(cookies.get(NAME_COOKIE) ?? ''),
    avatar: decodeAvatar(cookies.get(AVATAR_COOKIE)),
  };
}

export function saveProfile(profile: StoredProfile): void {
  writeCookie(NAME_COOKIE, encodeURIComponent(profile.name));
  const avatar = profile.avatar === null ? null : encodeAvatar(profile.avatar);
  if (avatar === null) deleteCookie(AVATAR_COOKIE);
  else writeCookie(AVATAR_COOKIE, avatar);
}

/** "data:image/webp;base64,Ab+/" → "webp.Ab-_" – cookie-tauglich ohne aufblähendes URL-Encoding. */
function encodeAvatar(dataUrl: string): string | null {
  const match = DATA_URL.exec(dataUrl);
  if (!match) return null;
  const [, type, base64 = ''] = match;
  return `${type}.${base64.replaceAll('+', '-').replaceAll('/', '_')}`;
}

function decodeAvatar(cookieValue: string | undefined): string | null {
  const match = cookieValue === undefined ? null : COOKIE_AVATAR.exec(cookieValue);
  if (!match) return null;
  const [, type, base64url = ''] = match;
  return `data:image/${type};base64,${base64url.replaceAll('-', '+').replaceAll('_', '/')}`;
}

function readCookies(): Map<string, string> {
  const entries = document.cookie
    .split(';')
    .map((pair) => pair.trim())
    .filter(Boolean)
    .map((pair) => {
      const separator = pair.indexOf('=');
      return [pair.slice(0, separator), pair.slice(separator + 1)] as const;
    });
  return new Map(entries);
}

function writeCookie(name: string, value: string, maxAgeSeconds = ONE_YEAR_IN_SECONDS): void {
  const secure = location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${name}=${value}; Max-Age=${maxAgeSeconds}; Path=/; SameSite=Lax${secure}`;
}

function deleteCookie(name: string): void {
  writeCookie(name, '', 0);
}
