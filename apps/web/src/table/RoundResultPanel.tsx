import type { Card, PlayerView, RoundResult } from '@allinscrum/protocol';
import { motion } from 'motion/react';
import { type CSSProperties, useEffect, useState } from 'react';
import { Avatar } from '../profile/Avatar.tsx';
import { SparklesIcon } from '../ui/icons.tsx';
import { cardName } from './card-name.ts';
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

/** Ergebnis der Runde: Durchschnitt, Kartenvorschlag und die Karten gestapelt nach Wert. */
export function RoundResultPanel({ result, players, deck }: RoundResultPanelProps) {
  const freshlyRevealed = useFreshReveal();

  useEffect(() => {
    if (result.consensus) celebrate();
  }, [result.consensus]);

  return (
    <div className={styles.result}>
      <motion.div
        className={styles.summary}
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 14, delay: GATHER_DELAY_S + 0.5 }}
      >
        <AverageSentence average={result.average} />
        {suggestsOtherCard(result) && (
          <p className={styles.suggestion}>
            Nächstliegende Karte: <strong>{result.suggestedCard}</strong>
          </p>
        )}
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
          <SparklesIcon size={18} />
          Alle einig!
        </motion.p>
      )}
    </div>
  );
}

const oneDecimal = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1 });

function AverageSentence({ average }: { average: number | null }) {
  if (average === null) {
    return <p className={styles.average}>Ohne Zahlenkarten gibt es keinen Durchschnitt.</p>;
  }
  const written = oneDecimal.format(average);
  return (
    <p className={styles.average}>
      Das Team hat im Schnitt <strong className={styles.averageValue}>{written}</strong>{' '}
      {written === '1' ? 'Storypoint' : 'Storypoints'} gegeben.
    </p>
  );
}

/** Der Vorschlag lohnt sich nur, wenn der Durchschnitt zwischen zwei Karten liegt. */
function suggestsOtherCard({ average, suggestedCard }: RoundResult): boolean {
  return suggestedCard !== null && Number(suggestedCard) !== average;
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

/**
 * Alle Karten eines Wertes. Wer nach dem Aufdecken getauscht hat, steht mit seiner Karte einzeln
 * daneben – so sieht man, wer umgeschwenkt ist. Die übrigen bleiben gestapelt.
 */
function StackOfCards({ stack, delay }: { stack: CardStack; delay: number }) {
  const names = stack.players.map((player) => player.name).join(', ');
  const unchanged = stack.players.filter((player) => player.replacedCard === null);
  const swapped = stack.players.filter((player) => player.replacedCard !== null);
  return (
    <motion.div
      layout
      role="group"
      aria-label={`Stapel ${cardName(stack.card)}: ${names}`}
      className={styles.stack}
      initial={{ opacity: 0, y: 24, scale: 0.7 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 240, damping: 20, delay }}
    >
      {unchanged.length > 0 && <PileWithOwners players={unchanged} />}
      {swapped.map((player) => (
        <PileWithOwners key={player.id} players={[player]} swapped />
      ))}
    </motion.div>
  );
}

interface PileWithOwnersProps {
  readonly players: readonly PlayerView[];
  readonly swapped?: boolean;
}

/** Karten übereinander, darunter die Gesichter und Namen derer, die sie gelegt haben. */
function PileWithOwners({ players, swapped = false }: PileWithOwnersProps) {
  return (
    <motion.div
      layout
      role="group"
      aria-label={players.map((player) => player.name).join(', ')}
      className={styles.column}
      data-swapped={swapped}
    >
      <div className={styles.pile} style={{ '--pile-size': players.length } as CSSProperties}>
        {players.map((player, position) => (
          // layoutId: Beim Tauschen wandern Karte und Gesicht sichtbar an ihren neuen Platz.
          <motion.div
            key={player.id}
            layoutId={`result-card-${player.id}`}
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
        {players.map((player) => (
          <motion.span
            key={player.id}
            layoutId={`result-owner-${player.id}`}
            className={styles.owner}
            title={player.name}
          >
            <Avatar name={player.name} avatar={player.avatar} size={40} />
            <span className={styles.ownerName}>{player.name}</span>
          </motion.span>
        ))}
      </div>
    </motion.div>
  );
}
