/**
 * Kopiert Text in die Zwischenablage.
 *
 * Die Clipboard-API gibt es nur in sicheren Kontexten (HTTPS oder localhost). Wer AllInScrum über
 * http://<server>:<port> im LAN aufruft, hat sie nicht – dann bleibt nur der alte Weg über eine
 * Textauswahl und execCommand('copy'). Der läuft synchron, damit er noch als Reaktion auf den
 * Klick gilt.
 *
 * @returns true, wenn der Text in der Zwischenablage liegt.
 */
export function copyText(text: string): Promise<boolean> {
  if (!navigator.clipboard) return Promise.resolve(copyViaSelection(text));
  return navigator.clipboard.writeText(text).then(
    () => true,
    () => copyViaSelection(text),
  );
}

function copyViaSelection(text: string): boolean {
  const previousFocus = document.activeElement;
  const field = document.createElement('textarea');
  field.value = text;
  // readonly: Auf Mobilgeräten klappt sonst kurz die Tastatur auf.
  field.readOnly = true;
  Object.assign(field.style, { position: 'fixed', top: '0', left: '0', opacity: '0' });
  document.body.append(field);
  try {
    field.focus({ preventScroll: true });
    field.setSelectionRange(0, text.length);
    // Veraltet, aber ohne sicheren Kontext der einzige Weg in die Zwischenablage.
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    field.remove();
    if (previousFocus instanceof HTMLElement) previousFocus.focus({ preventScroll: true });
  }
}
