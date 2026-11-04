import { useCallback, useEffect, useRef, useState } from 'react';
import { copyText } from './clipboard.ts';

const FEEDBACK_MS = 1_800;

/** Kopiert Text in die Zwischenablage und meldet kurz "kopiert" zurück. */
export function useClipboard() {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = useCallback(async (text: string) => {
    if (!(await copyText(text))) return;
    setCopied(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), FEEDBACK_MS);
  }, []);

  return { copy, copied };
}
