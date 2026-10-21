import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { useProfile } from '../profile/ProfileContext.tsx';
import { ProfileEditor } from '../profile/ProfileEditor.tsx';
import { Button } from '../ui/Button.tsx';
import { CreateSessionForm } from './CreateSessionForm.tsx';
import styles from './HomePage.module.css';
import { JoinByCodeForm } from './JoinByCodeForm.tsx';

type Mode = 'choose' | 'create' | 'join';

const slide = {
  initial: { opacity: 0, y: 16, filter: 'blur(6px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
  exit: { opacity: 0, y: -12, filter: 'blur(6px)' },
  transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] },
} as const;

export function HomePage() {
  const { profile } = useProfile();
  const [mode, setMode] = useState<Mode>('choose');
  const hasName = profile.name.trim().length > 0;

  return (
    <main className={styles.page}>
      <section className={styles.panel}>
        <header className={styles.header}>
          <h1 className={styles.title}>
            All<span>In</span>Scrum
          </h1>
          <p className={styles.tagline}>Planning Poker am Pokertisch – ohne Anmeldung.</p>
        </header>

        <ProfileEditor />

        <AnimatePresence mode="wait" initial={false}>
          {mode === 'choose' && (
            <motion.div key="choose" className={styles.actions} {...slide}>
              <Button variant="primary" disabled={!hasName} onClick={() => setMode('create')}>
                Session erstellen
              </Button>
              <Button variant="secondary" disabled={!hasName} onClick={() => setMode('join')}>
                Session beitreten
              </Button>
            </motion.div>
          )}
          {mode === 'create' && (
            <motion.div key="create" {...slide}>
              <CreateSessionForm onCancel={() => setMode('choose')} />
            </motion.div>
          )}
          {mode === 'join' && (
            <motion.div key="join" {...slide}>
              <JoinByCodeForm onCancel={() => setMode('choose')} />
            </motion.div>
          )}
        </AnimatePresence>
      </section>
    </main>
  );
}
