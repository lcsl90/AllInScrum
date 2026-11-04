import { useCallback, useEffect, useRef, useState } from 'react';
import { copyText } from './clipboard.ts';

const FEEDBACK_MS = 1_800;

/** Ergebnis des letzten Kopierversuchs – null, sobald die Rückmeldung wieder verschwunden ist. */
export type CopyOutcome = 'copied' | 'failed' | null;

/** Kopiert Text in die Zwischenablage und meldet kurz zurück, ob es geklappt hat. */
export function useClipboard() {
  const [outcome, setOutcome] = useState<CopyOutcome>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = useCallback(async (text: string) => {
    setOutcome((await copyText(text)) ? 'copied' : 'failed');
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setOutcome(null), FEEDBACK_MS);
  }, []);

  return { copy, outcome };
}
