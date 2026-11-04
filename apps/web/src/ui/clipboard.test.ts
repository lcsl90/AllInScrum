import { describe, expect, it, onTestFinished, vi } from 'vitest';
import { withLegacyClipboardOnly } from '../test/legacy-clipboard.ts';
import { copyText } from './clipboard.ts';

/** Eine Clipboard-API, deren writeText sich wie angegeben verhält. */
function withClipboardApi(writeText: (text: string) => Promise<void>) {
  const clipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
  onTestFinished(() => {
    if (clipboard) Object.defineProperty(navigator, 'clipboard', clipboard);
    else Reflect.deleteProperty(navigator, 'clipboard');
  });
}

describe('copyText', () => {
  it('nutzt die Clipboard-API, wo der Browser sie anbietet', async () => {
    const writeText = vi.fn(() => Promise.resolve());
    withClipboardApi(writeText);

    await expect(copyText('K7Q-X2M')).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith('K7Q-X2M');
  });

  it('kopiert über die Textauswahl, wenn der Browser die Clipboard-API verweigert', async () => {
    const legacy = withLegacyClipboardOnly();
    withClipboardApi(() => Promise.reject(new DOMException('Verweigert', 'NotAllowedError')));

    await expect(copyText('K7Q-X2M')).resolves.toBe(true);
    expect(legacy.copiedText).toBe('K7Q-X2M');
  });

  it('meldet, wenn der Browser das Kopieren ganz verweigert', async () => {
    withLegacyClipboardOnly({ copySucceeds: false });

    await expect(copyText('K7Q-X2M')).resolves.toBe(false);
  });

  it('hinterlässt keine Spuren und gibt den Fokus zurück', async () => {
    withLegacyClipboardOnly();
    const button = document.body.appendChild(document.createElement('button'));
    onTestFinished(() => button.remove());
    button.focus();

    await copyText('K7Q-X2M');

    expect(document.activeElement).toBe(button);
    expect(document.querySelector('textarea')).toBeNull();
  });
});
