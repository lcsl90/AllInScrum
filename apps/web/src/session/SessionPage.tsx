import type { ErrorCode } from '@allinscrum/protocol';
import { motion } from 'motion/react';
import { useProfile } from '../profile/ProfileContext.tsx';
import { ProfileEditor } from '../profile/ProfileEditor.tsx';
import { PokerTable } from '../table/PokerTable.tsx';
import { Button } from '../ui/Button.tsx';
import { errorMessage } from '../ui/error-messages.ts';
import { SessionNotice } from './SessionNotice.tsx';
import styles from './SessionPage.module.css';
import { useSessionConnection } from './use-session-connection.ts';

export function SessionPage(props: { joinCode: string }) {
  const { connection, online, join } = useSessionConnection(props.joinCode);

  switch (connection.status) {
    case 'needs-profile':
      return <NameGate onJoin={() => void join()} />;
    case 'failed':
      return (
        <SessionNotice
          title={failureTitle(connection.error)}
          message={errorMessage(connection.error)}
        />
      );
    case 'closed':
      return (
        <SessionNotice
          title="Tisch abgeräumt"
          message="Die Session wurde beendet, weil längere Zeit niemand etwas getan hat."
        />
      );
    case 'seated':
      if (connection.view) return <PokerTable view={connection.view} online={online} />;
      return <TakingSeat />;
    case 'joining':
      return <TakingSeat />;
  }
}

function failureTitle(error: ErrorCode): string {
  if (error === 'session-not-found') return 'Tisch nicht gefunden';
  if (error === 'session-full') return 'Kein Platz frei';
  return 'Beitritt nicht möglich';
}

/** Wer per Link kommt und noch keinen Namen gespeichert hat, stellt sich erst kurz vor. */
function NameGate(props: { onJoin: () => void }) {
  const { profile } = useProfile();
  return (
    <main className={styles.gate}>
      <motion.form
        className={styles.card}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        onSubmit={(event) => {
          event.preventDefault();
          props.onJoin();
        }}
      >
        <h1 className={styles.title}>Willkommen am Tisch!</h1>
        <p className={styles.text}>Wie sollen dich die anderen sehen?</p>
        <ProfileEditor />
        <Button type="submit" variant="primary" disabled={profile.name.trim() === ''}>
          Platz nehmen
        </Button>
      </motion.form>
    </main>
  );
}

function TakingSeat() {
  return (
    <main className={styles.waiting} aria-busy="true">
      <div className={styles.shuffle} aria-hidden="true">
        {[0, 1, 2].map((index) => (
          <motion.span
            key={index}
            className={styles.shuffleCard}
            animate={{ x: [0, (index - 1) * 26, 0], rotate: [0, (index - 1) * 14, 0] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut', delay: index * 0.08 }}
          />
        ))}
      </div>
      <p>Nehme Platz …</p>
    </main>
  );
}
