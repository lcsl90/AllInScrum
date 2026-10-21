import { type Card, COFFEE_CARD } from '@allinscrum/protocol';
import { motion } from 'motion/react';
import { CoffeeIcon } from '../ui/icons.tsx';
import { cardName } from './card-name.ts';
import styles from './PlayingCard.module.css';

interface PlayingCardProps {
  /** Der Wert auf der Vorderseite – null, solange er verborgen ist. */
  readonly value: Card | null;
  readonly faceUp: boolean;
  readonly uncertain?: boolean;
  /** Ausgeteilt, aber noch nicht gelegt. */
  readonly waiting?: boolean;
  /** Nach dem Aufdecken getauscht: Die ursprüngliche Karte schaut darunter hervor. */
  readonly replaced?: Card | null;
  /** Dreht sich beim Erscheinen von verdeckt nach offen – der Moment des Aufdeckens. */
  readonly flipIn?: boolean;
  /** Wem die Karte gehört – für Screenreader. */
  readonly owner?: string;
  readonly size?: 'table' | 'hand';
}

/** Eine Pokerkarte mit 3D-Flip zwischen Rücken und Vorderseite. */
export function PlayingCard({
  value,
  faceUp,
  uncertain = false,
  waiting = false,
  replaced = null,
  flipIn = false,
  owner,
  size = 'table',
}: PlayingCardProps) {
  const description = describe({ value, faceUp, waiting, uncertain, replaced });
  return (
    <div
      className={styles.card}
      data-size={size}
      data-uncertain={uncertain}
      data-long={hasLongText(value)}
      role="img"
      aria-label={owner ? `${owner}: ${description}` : description}
    >
      {replaced !== null && (
        <motion.div
          className={styles.replaced}
          data-long={hasLongText(replaced)}
          initial={{ rotate: 0, x: 0, y: 0 }}
          animate={{ rotate: -18, x: '-34%', y: '-10%' }}
          transition={{ type: 'spring', stiffness: 220, damping: 16 }}
          aria-hidden="true"
        >
          <Face value={replaced} />
        </motion.div>
      )}
      <motion.div
        className={styles.inner}
        initial={flipIn ? { rotateY: 180 } : false}
        animate={{ rotateY: faceUp ? 0 : 180 }}
        transition={{ type: 'spring', stiffness: 260, damping: 22, delay: flipIn ? 0.25 : 0 }}
      >
        <div className={styles.front}>
          <Face value={value} />
        </div>
        <div className={styles.back} />
      </motion.div>
      {uncertain && (
        <span className={styles.uncertainBadge} aria-hidden="true">
          !
        </span>
      )}
    </div>
  );
}

function Face({ value }: { value: Card | null }) {
  const face = value === COFFEE_CARD ? <CoffeeIcon /> : value;
  return (
    <>
      <span className={styles.corner}>{face}</span>
      <span className={styles.value}>{face}</span>
      <span className={`${styles.corner} ${styles.cornerBottom}`}>{face}</span>
    </>
  );
}

/** Mehrstellige Werte wie "13" brauchen eine kleinere Schrift – Symbole nicht. */
function hasLongText(value: Card | null): boolean {
  return value !== null && value !== COFFEE_CARD && value.length > 1;
}

interface Description {
  readonly value: Card | null;
  readonly faceUp: boolean;
  readonly waiting: boolean;
  readonly uncertain: boolean;
  readonly replaced: Card | null;
}

function describe({ value, faceUp, waiting, uncertain, replaced }: Description): string {
  const face = waiting
    ? 'noch keine Karte gelegt'
    : faceUp && value !== null
      ? `Karte ${cardName(value)}`
      : 'verdeckte Karte';
  const details = [
    face,
    replaced !== null && `getauscht von ${cardName(replaced)}`,
    uncertain && 'unsicher',
  ];
  return details.filter(Boolean).join(', ');
}
