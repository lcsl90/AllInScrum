import type { PlayerView, RoundPhase } from '@allinscrum/protocol';
import { motion } from 'motion/react';
import type { CSSProperties } from 'react';
import { PlayingCard } from './PlayingCard.tsx';
import { GATHER_DELAY_S } from './reveal-timing.ts';
import type { Point } from './seat-layout.ts';
import styles from './SeatCard.module.css';

interface SeatCardProps {
  readonly player: PlayerView;
  readonly phase: RoundPhase;
  readonly position: Point;
  /** Reihenfolge beim Austeilen – sorgt für den Fächer-Effekt am Tisch. */
  readonly dealOrder: number;
}

/**
 * Die Karte vor einem Spieler: ausgeteilt, gelegt – und beim Aufdecken umgedreht, bevor sie zu den
 * Stapeln in die Tischmitte wandert.
 */
export function SeatCard({ player, phase, position, dealOrder }: SeatCardProps) {
  // Zuschauer spielen nicht mit – dass sie zuschauen, steht schon an ihrem Platz.
  if (phase === 'lobby' || player.isSpectator) return null;
  const placement = { left: `${position.x}%`, top: `${position.y}%` } as CSSProperties;

  if (player.status === 'ignored') {
    return (
      <motion.span
        className={styles.paused}
        style={placement}
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        setzt aus
      </motion.span>
    );
  }

  const hasCard = player.status === 'voted';
  if (phase === 'revealed' && !hasCard) return null;
  const gathering = phase === 'revealed';

  return (
    <motion.div
      className={styles.slot}
      style={placement}
      data-placed={hasCard}
      // Nach dem Umdrehen stellvertretend in den Stapeln zu sehen – hier nur noch Animation.
      aria-hidden={gathering}
      // Austeilen: Jede Karte fliegt vom Geber in der Tischmitte zu ihrem Platz.
      initial={{ left: '50%', top: '50%', rotate: -160, scale: 0.4, opacity: 0 }}
      animate={
        gathering
          ? {
              left: '50%',
              top: '50%',
              rotate: 0,
              scale: 0.8,
              opacity: 0,
              transition: { delay: GATHER_DELAY_S - 0.3, duration: 0.55, ease: [0.55, 0, 0.45, 1] },
            }
          : {
              left: `${position.x}%`,
              top: `${position.y}%`,
              rotate: hasCard ? 0 : dealOrder % 2 === 0 ? -6 : 6,
              scale: hasCard ? 1.08 : 0.92,
              opacity: hasCard ? 1 : 0.55,
              transition: { type: 'spring', stiffness: 170, damping: 20, delay: dealOrder * 0.12 },
            }
      }
    >
      <PlayingCard
        owner={player.name}
        value={player.card}
        faceUp={gathering || player.cardOpen}
        uncertain={player.uncertain}
        waiting={!hasCard}
      />
    </motion.div>
  );
}
