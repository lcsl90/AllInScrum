import { type FormEvent, useId, useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '../ui/Button.tsx';
import styles from './HomeForms.module.css';
import { formatJoinCodeInput, isCompleteJoinCode } from './join-code-input.ts';

/** Sessions sind unsichtbar – hinein kommt nur, wer den Code vom Ersteller bekommen hat. */
export function JoinByCodeForm(props: { onCancel: () => void }) {
  const [, navigate] = useLocation();
  const codeId = useId();
  const [code, setCode] = useState('');

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    navigate(`/s/${code}`);
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.field}>
        <label htmlFor={codeId} className={styles.label}>
          Join-Code
        </label>
        <input
          id={codeId}
          className={`${styles.input} ${styles.codeInput}`}
          value={code}
          placeholder="ABC-123"
          inputMode="text"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          autoFocus
          onChange={(event) => setCode(formatJoinCodeInput(event.target.value))}
        />
        <p className={styles.hint}>
          Den Code bekommst du von der Person, die die Session eröffnet hat.
        </p>
      </div>
      <div className={styles.buttons}>
        <Button variant="ghost" onClick={props.onCancel}>
          Zurück
        </Button>
        <Button type="submit" variant="primary" disabled={!isCompleteJoinCode(code)}>
          Beitreten
        </Button>
      </div>
    </form>
  );
}
