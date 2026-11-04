import { onTestFinished } from 'vitest';

export interface LegacyClipboard {
  /** Was zuletzt per execCommand('copy') kopiert wurde – null, solange nichts kopiert wurde. */
  readonly copiedText: string | null;
}

/**
 * Simuliert eine Seite ohne sicheren Kontext (z. B. http://192.168.0.10:41400 im LAN): Dort gibt
 * es keine Clipboard-API, nur das alte execCommand('copy'), das die aktuelle Textauswahl kopiert.
 * Nach `renderApp` aufrufen – user-event hängt beim Setup eine eigene Clipboard-API ein.
 */
export function withLegacyClipboardOnly({ copySucceeds = true } = {}): LegacyClipboard {
  const clipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
  const state: { copiedText: string | null } = { copiedText: null };

  Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true });
  Object.defineProperty(document, 'execCommand', {
    configurable: true,
    value: (command: string) => {
      if (command !== 'copy' || !copySucceeds) return false;
      state.copiedText = selectedText();
      return true;
    },
  });

  onTestFinished(() => {
    Reflect.deleteProperty(document, 'execCommand');
    if (clipboard) Object.defineProperty(navigator, 'clipboard', clipboard);
  });
  return state;
}

/** Der Browser kopiert, was im fokussierten Eingabefeld markiert ist. */
function selectedText(): string | null {
  const field = document.activeElement;
  if (!(field instanceof HTMLTextAreaElement || field instanceof HTMLInputElement)) return null;
  return field.value.slice(field.selectionStart ?? 0, field.selectionEnd ?? 0);
}
