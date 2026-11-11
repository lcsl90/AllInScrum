import type { RoundRecord } from '@allinscrum/protocol';
import { CheckIcon } from '../ui/icons.tsx';
import { cardName } from './card-name.ts';
import styles from './RoundHistory.module.css';

interface RoundHistoryProps {
  readonly history: readonly RoundRecord[];
}

const timeOfDay = new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit' });
const oneDecimal = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1 });

/** Was das Team heute schon geschätzt hat – kompakt in der Ecke, das Jüngste oben. */
export function RoundHistory({ history }: RoundHistoryProps) {
  const today = history.filter((record) => isToday(record.revealedAt)).reverse();
  if (today.length === 0) return null;
  return (
    <aside aria-label="Heute geschätzt" className={styles.history}>
      <h2 className={styles.title}>Heute geschätzt</h2>
      <ol className={styles.entries}>
        {today.map((record) => (
          <HistoryEntry key={record.round} record={record} />
        ))}
      </ol>
    </aside>
  );
}

function HistoryEntry({ record }: { record: RoundRecord }) {
  const card = record.consensusCard ?? record.suggestedCard;
  return (
    <li className={styles.entry}>
      <span className={styles.round}>Runde {record.round}</span>
      <time className={styles.time} dateTime={new Date(record.revealedAt).toISOString()}>
        {timeOfDay.format(record.revealedAt)}
      </time>
      <span className={styles.card}>{card === null ? '–' : cardName(card)}</span>
      {record.consensusCard === null ? (
        record.average !== null && (
          <span className={styles.detail}>Ø {oneDecimal.format(record.average)}</span>
        )
      ) : (
        <span className={styles.detail} data-agreed="true">
          <CheckIcon size={12} />
          einig
        </span>
      )}
    </li>
  );
}

/** "Heute" in der Zeitzone des Betrachters – der Server kennt nur die letzten 24 Stunden. */
function isToday(timestamp: number): boolean {
  return new Date(timestamp).toDateString() === new Date().toDateString();
}
