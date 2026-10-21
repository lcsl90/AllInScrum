import type { PlayerView, SessionView } from '@allinscrum/protocol';
import { AnimatePresence, motion } from 'motion/react';
import { Button } from '../ui/Button.tsx';
import styles from './CenterStage.module.css';
import { InvitePanel } from './InvitePanel.tsx';
import { RoundResultPanel } from './RoundResultPanel.tsx';
import type { TableCommands } from './use-table-commands.ts';

interface CenterStageProps {
  readonly view: SessionView;
  readonly commands: TableCommands;
}

const appear = {
  initial: { opacity: 0, scale: 0.9, y: 8 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.9, y: -8 },
  transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] },
} as const;

/** Die Tischmitte: Hier passiert, was gerade dran ist – Start, Fortschritt, Ergebnis. */
export function CenterStage({ view, commands }: CenterStageProps) {
  const me = view.players.find((player) => player.id === view.youId);
  const isAdmin = me?.isAdmin ?? false;

  return (
    <div className={styles.stage} data-phase={view.phase}>
      <AnimatePresence mode="wait">
        {view.phase === 'lobby' && view.players.length === 1 && (
          <motion.div key="invite" {...appear}>
            <InvitePanel joinCode={view.joinCode} />
          </motion.div>
        )}

        {view.phase === 'lobby' && view.players.length > 1 && (
          <motion.div key="lobby" className={styles.progress} {...appear}>
            {isAdmin ? (
              <>
                <Button variant="primary" disabled={!view.canStart} onClick={commands.startRound}>
                  Runde starten
                </Button>
                {!view.canStart && (
                  <p className={styles.hint}>Für eine Runde braucht es mindestens zwei.</p>
                )}
              </>
            ) : (
              <p className={styles.hint}>Warte, bis {adminName(view.players)} die Runde startet …</p>
            )}
          </motion.div>
        )}

        {view.phase === 'voting' && (
          <motion.div key={`voting-${view.round}`} className={styles.progress} {...appear}>
            <VotingProgress players={view.players} />
            {isAdmin && (
              <Button variant="primary" disabled={!view.canReveal} onClick={commands.reveal}>
                Aufdecken
              </Button>
            )}
          </motion.div>
        )}

        {view.phase === 'revealed' && view.result && (
          <motion.div key={`revealed-${view.round}`} className={styles.progress} {...appear}>
            <RoundResultPanel result={view.result} players={view.players} deck={view.deck} />
            {isAdmin ? (
              <Button variant="primary" disabled={!view.canStart} onClick={commands.startRound}>
                Nächste Runde
              </Button>
            ) : (
              <p className={styles.hint}>Diskutiert die Ausreißer!</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function VotingProgress({ players }: { players: readonly PlayerView[] }) {
  const counted = players.filter((player) => player.status !== 'ignored');
  const voted = counted.filter((player) => player.status === 'voted').length;
  return (
    <>
      <span className={styles.progressLabel}>
        {voted} von {counted.length} haben geschätzt
      </span>
      <span className={styles.dots} aria-hidden="true">
        {counted.map((player) => (
          <span key={player.id} className={styles.dot} data-filled={player.status === 'voted'} />
        ))}
      </span>
    </>
  );
}

function adminName(players: readonly PlayerView[]): string {
  return players.find((player) => player.isAdmin)?.name ?? 'der Admin';
}
