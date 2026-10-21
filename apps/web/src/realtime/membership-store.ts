/*
 * Merkt sich pro Session das Geheimnis, mit dem man nach einem Reload auf seinen Platz zurückkehrt.
 * localStorage kann (privater Modus, blockierter Speicher) fehlen – dann gibt es eben kein Wiederkehren.
 */

const PREFIX = 'allinscrum.resume.';

export function rememberMembership(sessionId: string, resumeToken: string): void {
  try {
    localStorage.setItem(PREFIX + sessionId, resumeToken);
  } catch {
    // Ohne Speicher wird man beim Reload als neuer Spieler gesetzt.
  }
}

export function resumeTokenFor(sessionId: string): string | undefined {
  try {
    return localStorage.getItem(PREFIX + sessionId) ?? undefined;
  } catch {
    return undefined;
  }
}

export function forgetMembership(sessionId: string): void {
  try {
    localStorage.removeItem(PREFIX + sessionId);
  } catch {
    // Nichts zu vergessen.
  }
}
