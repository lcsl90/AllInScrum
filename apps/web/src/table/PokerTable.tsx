import type { PlayerView, SessionView } from '@allinscrum/protocol';
import { AnimatePresence, motion } from 'motion/react';
import { useLocation } from 'wouter';
import { forgetMembership } from '../realtime/membership-store.ts';
import { useSessionClient } from '../realtime/SessionClientContext.tsx';
import { Button } from '../ui/Button.tsx';
import { ExitIcon } from '../ui/icons.tsx';
import { CardHand } from './CardHand.tsx';
import { CenterStage } from './CenterStage.tsx';
import { JoinCodeBadge } from './JoinCodeBadge.tsx';
import styles from './PokerTable.module.css';
import { Seat, type SeatAction } from './Seat.tsx';
import { SeatCard } from './SeatCard.tsx';
import { seatLayout } from './seat-layout.ts';
import { SpectatorToggle } from './SpectatorToggle.tsx';
import { UncertainToggle } from './UncertainToggle.tsx';
import { type TableCommands, useTableCommands } from './use-table-commands.ts';

interface PokerTableProps {
  readonly view: SessionView;
  /** false, solange die Verbindung zum Server unterbrochen ist. */
  readonly online: boolean;
}

export function PokerTable({ view, online }: PokerTableProps) {
  const commands = useTableCommands();
  const viewerIndex = Math.max(
    0,
    view.players.findIndex((player) => player.id === view.youId),
  );
  const layout = seatLayout(view.players.length, viewerIndex);
  const me = view.players[viewerIndex];

  return (
    <div className={styles.room}>
      <TableHeader view={view} online={online} />

      <div className={styles.tableArea}>
        <div className={styles.table}>
          <div className={styles.rail} />
          <div className={styles.felt}>
            <div className={styles.feltLine} />
            <span
              className={styles.feltLogo}
              aria-hidden="true"
              data-hidden={view.phase !== 'lobby'}
            >
              AllInScrum
            </span>
          </div>
          <div className={styles.seats}>
            <AnimatePresence>
              {view.players.map((player, index) => (
                <Seat
                  key={player.id}
                  player={player}
                  position={layout[index]!.seat}
                  isYou={player.id === view.youId}
                  actions={me?.isAdmin ? adminActionsFor(player, view, commands) : []}
                />
              ))}
            </AnimatePresence>
            {view.players.map((player, index) => (
              <SeatCard
                key={`${player.id}-${view.round}`}
                player={player}
                phase={view.phase}
                position={layout[index]!.card}
                dealOrder={(index - viewerIndex + view.players.length) % view.players.length}
              />
            ))}
            <CenterStage view={view} commands={commands} />
          </div>
        </div>
      </div>

      <footer className={styles.handArea}>
        {me && <PlayerControls me={me} view={view} commands={commands} />}
      </footer>
    </div>
  );
}

function TableHeader({ view, online }: PokerTableProps) {
  const client = useSessionClient();
  const [, navigate] = useLocation();

  async function leave() {
    await client.leaveSession();
    forgetMembership(view.joinCode);
    navigate('/');
  }

  return (
    <header className={styles.header}>
      <div className={styles.titleGroup}>
        <h1 className={styles.title}>{view.name}</h1>
        <span className={styles.roundLabel}>
          {view.round === 0 ? 'Noch keine Runde gespielt' : `Runde ${view.round}`}
        </span>
      </div>
      <div className={styles.headerActions}>
        <AnimatePresence>
          {!online && (
            <motion.span
              className={styles.connection}
              role="status"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
            >
              Verbindung unterbrochen …
            </motion.span>
          )}
        </AnimatePresence>
        <JoinCodeBadge joinCode={view.joinCode} />
        <Button
          variant="ghost"
          size="small"
          onClick={() => void leave()}
          aria-label="Tisch verlassen"
        >
          <ExitIcon size={16} />
          <span className={styles.leaveLabel}>Verlassen</span>
        </Button>
      </div>
    </header>
  );
}

interface PlayerControlsProps {
  readonly me: PlayerView;
  readonly view: SessionView;
  readonly commands: TableCommands;
}

/**
 * Die eigene Hand mit Unsicherheits-Schalter, solange gespielt wird – und jederzeit der Schalter,
 * um nur zuzuschauen.
 */
function PlayerControls({ me, view, commands }: PlayerControlsProps) {
  const spectatorToggle = (
    <SpectatorToggle spectating={me.isSpectator} onChange={commands.setSpectating} />
  );
  if (me.isSpectator) {
    return (
      <>
        <p className={styles.sittingOut}>Du schaust nur zu und schätzt nicht mit.</p>
        <div className={styles.toggles}>{spectatorToggle}</div>
      </>
    );
  }
  const sittingOut = me.status === 'ignored';
  const playing = canPlay(me, view);
  return (
    <>
      {sittingOut && <p className={styles.sittingOut}>Du setzt diese Runde aus.</p>}
      {playing && (
        <CardHand
          deck={view.deck}
          selected={me.card}
          round={view.round}
          disabled={sittingOut}
          canRetract={view.phase === 'voting'}
          onSelect={commands.vote}
        />
      )}
      <div className={styles.toggles}>
        {playing && (
          <UncertainToggle
            uncertain={me.uncertain}
            disabled={sittingOut}
            onChange={commands.setUncertain}
          />
        )}
        {spectatorToggle}
      </div>
    </>
  );
}

/** Karten gibt es während der Schätzung – und danach zum Tauschen für alle, die aufgedeckt haben. */
function canPlay(me: PlayerView, view: SessionView): boolean {
  return view.phase === 'voting' || (view.phase === 'revealed' && me.status === 'voted');
}

/** Was der Admin mit einem anderen Spieler tun kann – Zuschauer entscheiden selbst, ob sie mitschätzen. */
function adminActionsFor(
  player: PlayerView,
  view: SessionView,
  commands: TableCommands,
): SeatAction[] {
  if (player.id === view.youId) return [];
  const ignored = player.status === 'ignored';
  const ignoreAction: SeatAction = {
    label: ignored ? 'Wieder mitspielen lassen' : 'Diese Runde aussetzen lassen',
    onSelect: () => commands.ignorePlayer(player.id, !ignored),
  };
  return [
    ...(view.phase === 'voting' && !player.isSpectator ? [ignoreAction] : []),
    { label: 'Zum Admin machen', onSelect: () => commands.transferAdmin(player.id) },
  ];
}
