import type { ErrorCode } from '@allinscrum/protocol';
import { type FormEvent, useId, useState } from 'react';
import { useLocation } from 'wouter';
import { useProfile } from '../profile/ProfileContext.tsx';
import { rememberMembership } from '../realtime/membership-store.ts';
import { useSessionClient } from '../realtime/SessionClientContext.tsx';
import { Button } from '../ui/Button.tsx';
import { errorMessage } from '../ui/error-messages.ts';
import { defaultSessionName } from './default-session-name.ts';
import styles from './HomeForms.module.css';

const MAX_SESSION_NAME_LENGTH = 40;

export function CreateSessionForm(props: { onCancel: () => void }) {
  const { profile } = useProfile();
  const client = useSessionClient();
  const [, navigate] = useLocation();
  const nameId = useId();
  const [sessionName, setSessionName] = useState(() => defaultSessionName(profile.name));
  const [error, setError] = useState<ErrorCode | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    const response = await client.createSession({ sessionName, profile });
    setBusy(false);
    if (!response.ok) {
      setError(response.error);
      return;
    }
    rememberMembership(response.data.joinCode, response.data.resumeToken);
    navigate(`/s/${response.data.joinCode}`);
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.field}>
        <label htmlFor={nameId} className={styles.label}>
          Name der Session
        </label>
        <input
          id={nameId}
          className={styles.input}
          value={sessionName}
          maxLength={MAX_SESSION_NAME_LENGTH}
          onChange={(event) => setSessionName(event.target.value)}
          autoFocus
        />
        <p className={styles.hint}>
          Die Session ist unsichtbar. Du bekommst einen Join-Code, den du an dein Team schickst.
        </p>
      </div>
      {error && (
        <p role="alert" className={styles.error}>
          {errorMessage(error)}
        </p>
      )}
      <div className={styles.buttons}>
        <Button variant="ghost" onClick={props.onCancel}>
          Zurück
        </Button>
        <Button type="submit" variant="primary" disabled={busy || sessionName.trim() === ''}>
          Tisch eröffnen
        </Button>
      </div>
    </form>
  );
}
