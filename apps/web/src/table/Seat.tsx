import type { PlayerView } from '@allinscrum/protocol';
import { AnimatePresence, motion } from 'motion/react';
import { type CSSProperties, useEffect, useRef, useState } from 'react';
import { Avatar } from '../profile/Avatar.tsx';
import { CrownIcon } from '../ui/icons.tsx';
import type { Point } from './seat-layout.ts';
import styles from './Seat.module.css';

export interface SeatAction {
  readonly label: string;
  readonly onSelect: () => void;
}

interface SeatProps {
  readonly player: PlayerView;
  readonly position: Point;
  readonly isYou: boolean;
  /** Aktionen, die der Betrachter für diesen Spieler ausführen darf (nur für den Admin). */
  readonly actions?: readonly SeatAction[];
}

/** Ein Platz am Tischrand: Avatar, Name und Status des Spielers. */
export function Seat({ player, position, isYou, actions = [] }: SeatProps) {
  const avatar = (
    <div className={styles.avatar}>
      <Avatar name={player.name} avatar={player.avatar} size={52} />
      {player.isAdmin && (
        <span className={styles.crown} role="img" aria-label="Admin">
          <CrownIcon size={14} />
        </span>
      )}
    </div>
  );

  return (
    <motion.div
      className={styles.seat}
      style={{ left: `${position.x}%`, top: `${position.y}%` } as CSSProperties}
      data-online={player.isOnline}
      data-you={isYou}
      layout
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.6 }}
      transition={{ type: 'spring', stiffness: 300, damping: 24 }}
    >
      {actions.length > 0 ? (
        <SeatMenu playerName={player.name} actions={actions}>
          {avatar}
        </SeatMenu>
      ) : (
        avatar
      )}
      <span className={styles.name}>
        {player.name}
        {isYou && <span className={styles.you}> (du)</span>}
      </span>
      {player.isSpectator && <span className={styles.status}>schaut zu</span>}
      {!player.isOnline && <span className={styles.status}>offline</span>}
    </motion.div>
  );
}

interface SeatMenuProps {
  readonly playerName: string;
  readonly actions: readonly SeatAction[];
  readonly children: React.ReactNode;
}

function SeatMenu({ playerName, actions, children }: SeatMenuProps) {
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: Event) => {
      if (event instanceof KeyboardEvent && event.key !== 'Escape') return;
      if (event instanceof PointerEvent && container.current?.contains(event.target as Node))
        return;
      setOpen(false);
    };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open]);

  return (
    <div ref={container} className={styles.menuAnchor}>
      <button
        type="button"
        className={styles.menuButton}
        aria-label={`Aktionen für ${playerName}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        {children}
      </button>
      <AnimatePresence>
        {open && (
          <motion.ul
            role="menu"
            className={styles.menu}
            initial={{ opacity: 0, scale: 0.9, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -6 }}
          >
            {actions.map((action) => (
              <li key={action.label} role="none">
                <button
                  type="button"
                  role="menuitem"
                  className={styles.menuItem}
                  onClick={() => {
                    setOpen(false);
                    action.onSelect();
                  }}
                >
                  {action.label}
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
