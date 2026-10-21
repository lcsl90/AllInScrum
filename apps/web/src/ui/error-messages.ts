import type { ErrorCode } from '@allinscrum/protocol';

const MESSAGES: Record<ErrorCode, string> = {
  'invalid-payload': 'Die Anfrage war ungültig. Bitte lade die Seite neu.',
  'invalid-name': 'Bitte gib einen Namen mit 1 bis 24 Zeichen ein.',
  'invalid-avatar': 'Das Foto konnte nicht verwendet werden.',
  'invalid-session-name': 'Bitte gib der Session einen Namen mit 1 bis 40 Zeichen.',
  'session-not-found': 'Zu diesem Code gibt es keine Session (mehr). Prüf den Code noch mal.',
  'session-full': 'Am Tisch ist leider kein Platz mehr frei.',
  'too-many-sessions': 'Gerade laufen zu viele Sessions. Bitte versuche es später erneut.',
  'too-many-attempts': 'Zu viele falsche Codes. Warte kurz und versuche es in einer Minute erneut.',
  'not-a-member': 'Du sitzt nicht mehr an diesem Tisch.',
  'player-not-found': 'Diesen Spieler gibt es am Tisch nicht mehr.',
  'not-admin': 'Das darf nur der Admin.',
  'not-enough-players': 'Für eine Runde braucht es mindestens zwei Spieler.',
  'round-not-active': 'Gerade läuft keine Schätzrunde.',
  'round-already-active': 'Es läuft bereits eine Schätzrunde.',
  'invalid-card': 'Diese Karte gibt es im Deck nicht.',
  'player-ignored': 'Du setzt diese Runde aus.',
  'votes-missing': 'Es haben noch nicht alle geschätzt.',
  internal: 'Da ist etwas schiefgelaufen. Bitte versuche es erneut.',
  'server-unreachable': 'Der Server antwortet gerade nicht. Prüfe deine Verbindung.',
};

export function errorMessage(code: ErrorCode): string {
  return MESSAGES[code];
}
