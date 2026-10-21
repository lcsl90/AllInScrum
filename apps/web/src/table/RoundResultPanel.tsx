import type { Card, PlayerView, RoundResult } from '@allinscrum/protocol';
import { motion } from 'motion/react';
import { type CSSProperties, useEffect, useState } from 'react';
import { Avatar } from '../profile/Avatar.tsx';
import { type CardStack, cardStacks } from './card-stacks.ts';
import { celebrate } from './celebrate.ts';
import { PlayingCard } from './PlayingCard.tsx';
import { GATHER_DELAY_S } from './reveal-timing.ts';
import styles from './RoundResultPanel.module.css';

interface RoundResultPanelProps {
  readonly result: RoundResult;
  readonly players: readonly PlayerView[];
  readonly deck: readonly Card[];
}

/** Ergebnis der Runde: Durchschnitt als Deck-Karte und die Karten gestapelt nach Wert. */
export function RoundResultPanel({ result, players, deck }: RoundResultPanelProps) {
  const freshlyRevealed = useFreshReveal();

  useEffect(() => {
    if (result.consensus) celebrate();
  }, [result.consensus]);

  return (
    <div className={styles.result}>
      <motion.div
        className={styles.average}
        initial={{ opacity: 0, scale: 0.4 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 14, delay: GATHER_DELAY_S + 0.5 }}
      >
        <span className={styles.averageSign} aria-hidden="true">
          Ø
        </span>
        <span aria-hidden="true">{result.average ?? '–'}</span>
        <span className="visually-hidden">Durchschnitt: {result.average ?? 'keiner'}</span>
      </motion.div>

      <div className={styles.stacks}>
        {cardStacks(players, deck).map((stack, index) => (
          <StackOfCards
            key={stack.card}
            stack={stack}
            delay={freshlyRevealed ? GATHER_DELAY_S + index * 0.08 : 0}
          />
        ))}
      </div>

      {result.consensus && (
        <motion.p
          className={styles.consensus}
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 14, delay: GATHER_DELAY_S + 0.7 }}
        >
          Alle einig! 🎉
        </motion.p>
      )}
    </div>
  );
}

/**
 * Nur beim Aufdecken warten die Stapel, bis die Karten an den Plätzen umgedreht sind.
 * Wer danach tauscht, sieht seinen Stapel sofort.
 */
function useFreshReveal(): boolean {
  const [fresh, setFresh] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setFresh(false), (GATHER_DELAY_S + 1) * 1000);
    return () => clearTimeout(timer);
  }, []);
  return fresh;
}

function StackOfCards({ stack, delay }: { stack: CardStack; delay: number }) {
  const names = stack.players.map((player) => player.name).join(', ');
  return (
    <motion.div
      layout
      role="group"
      aria-label={`Stapel ${stack.card}: ${names}`}
      className={styles.stack}
      initial={{ opacity: 0, y: 24, scale: 0.7 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 240, damping: 20, delay }}
    >
      <div
        className={styles.pile}
        style={{ '--pile-size': stack.players.length } as CSSProperties}
      >
        {stack.players.map((player, position) => (
          <motion.div
            key={player.id}
            layout
            className={styles.pileCard}
            style={{ '--position': position } as CSSProperties}
          >
            <PlayingCard
              owner={player.name}
              value={player.card}
              faceUp
              uncertain={player.uncertain}
              replaced={player.replacedCard}
            />
          </motion.div>
        ))}
      </div>
      <div className={styles.owners} aria-hidden="true">
        {stack.players.map((player) => (
          <span key={player.id} className={styles.owner} title={player.name}>
            <Avatar name={player.name} avatar={player.avatar} size={22} />
          </span>
        ))}
      </div>
    </motion.div>
  );
}
