import { motion } from 'motion/react';
import styles from './CenterStage.module.css';
import { JoinCodeBadge } from './JoinCodeBadge.tsx';

/** Solange man allein am Tisch sitzt: Der Code ist das Einzige, was jetzt zählt. */
export function InvitePanel({ joinCode }: { joinCode: string }) {
  return (
    <motion.div
      className={styles.invite}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 220, damping: 20 }}
    >
      <h2 className={styles.inviteTitle}>Lade dein Team ein</h2>
      <JoinCodeBadge joinCode={joinCode} large />
      <p className={styles.hint}>
        Die Session ist unsichtbar – nur wer den Code oder den Link hat, kommt an den Tisch.
      </p>
    </motion.div>
  );
}
