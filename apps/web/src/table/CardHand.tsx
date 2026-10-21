import type { Card } from '@allinscrum/protocol';
import { motion, type Variants } from 'motion/react';
import { type CSSProperties, useEffect, useState } from 'react';
import styles from './CardHand.module.css';
import { cardName } from './card-name.ts';
import { PlayingCard } from './PlayingCard.tsx';

interface CardHandProps {
  readonly deck: readonly Card[];
  readonly selected: Card | null;
  /** Wechselt mit jeder Runde – dann werden die Karten neu ausgeteilt. */
  readonly round: number;
  readonly disabled: boolean;
  /** Vor dem Aufdecken nimmt ein zweiter Klick die Karte zurück – danach kann man nur noch tauschen. */
  readonly canRetract: boolean;
  readonly onSelect: (card: Card | null) => void;
}

/** Die Karte unter der Maus hebt sich so weit an und wird so viel größer. */
const SPOTLIGHT_LIFT_PX = 56;
const SPOTLIGHT_SCALE = 1.32;

/**
 * Die eigenen Karten, aufgefächert wie auf der Hand.
 *
 * Jede Karte besteht aus einer festen Klickfläche (dem sichtbaren Streifen) und der Kartenoptik
 * darüber, die sich bewegt. So wandert die Klickfläche beim Hervorheben nicht unter der Maus weg –
 * kein Flackern. Nur die hervorgehobene Karte wächst mit ihrer Optik mit, damit man sie auch an
 * ihrem angehobenen Teil trifft.
 */
export function CardHand({ deck, selected, round, disabled, canRetract, onSelect }: CardHandProps) {
  const dealing = useDealing(round);

  function handleClick(card: Card) {
    if (card !== selected) onSelect(card);
    else if (canRetract) onSelect(null);
  }

  const spotlight = {
    '--spotlight-lift': `${SPOTLIGHT_LIFT_PX}px`,
    '--spotlight-scale': SPOTLIGHT_SCALE,
  } as CSSProperties;

  return (
    <div
      className={styles.hand}
      style={spotlight}
      role="group"
      aria-label="Deine Karten"
      data-disabled={disabled}
    >
      {deck.map((card, index) => {
        const isSelected = card === selected;
        return (
          <motion.button
            key={`${round}-${card}`}
            type="button"
            className={styles.slot}
            aria-label={`Karte ${cardName(card)}`}
            aria-pressed={isSelected}
            disabled={disabled}
            initial="dealing"
            animate={isSelected ? 'selected' : 'resting'}
            whileHover={disabled ? undefined : 'spotlight'}
            whileFocus={disabled ? undefined : 'spotlight'}
            onClick={() => handleClick(card)}
          >
            <motion.span
              className={styles.visual}
              variants={cardVariants}
              custom={{ ...fanPosition(index, deck.length), delay: dealing ? index * 0.035 : 0 }}
            >
              <PlayingCard value={card} faceUp size="hand" />
            </motion.span>
          </motion.button>
        );
      })}
    </div>
  );
}

interface FanSlot {
  readonly rotate: number;
  readonly drop: number;
  readonly delay: number;
}

const spring = { type: 'spring', stiffness: 320, damping: 24 } as const;

const cardVariants: Variants = {
  dealing: { y: -260, opacity: 0, rotate: 0, scale: 1, zIndex: 0 },
  resting: ({ rotate, drop, delay }: FanSlot) => ({
    y: drop,
    opacity: 1,
    rotate,
    scale: 1,
    zIndex: 0,
    transition: { ...spring, delay },
  }),
  selected: ({ rotate, drop, delay }: FanSlot) => ({
    y: drop - 26,
    opacity: 1,
    rotate,
    scale: 1,
    zIndex: 2,
    transition: { ...spring, delay },
  }),
  // Die Karte unter der Maus (oder im Tastaturfokus) kommt gerade, groß und ganz nach vorn.
  spotlight: {
    y: -SPOTLIGHT_LIFT_PX,
    opacity: 1,
    rotate: 0,
    scale: SPOTLIGHT_SCALE,
    zIndex: 20,
    transition: { type: 'spring', stiffness: 420, damping: 26 },
  },
};

const DEAL_DURATION_MS = 900;

/** true, solange die Karten einer neuen Runde noch ausgeteilt werden. */
function useDealing(round: number): boolean {
  const [dealtRound, setDealtRound] = useState<number | null>(null);
  useEffect(() => {
    const timer = setTimeout(() => setDealtRound(round), DEAL_DURATION_MS);
    return () => clearTimeout(timer);
  }, [round]);
  return dealtRound !== round;
}

/** Fächer: außen stärker gedreht und etwas tiefer, wie Karten in der Hand. */
function fanPosition(index: number, count: number): { rotate: number; drop: number } {
  const middle = (count - 1) / 2;
  const offset = count > 1 ? (index - middle) / middle : 0;
  return { rotate: offset * Math.min(18, count * 1.8), drop: Math.abs(offset) ** 2 * 14 };
}
