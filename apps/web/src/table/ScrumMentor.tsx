import type { PlayerView, RoundResult } from '@allinscrum/protocol';
import { motion } from 'motion/react';
import { Avatar } from '../profile/Avatar.tsx';
import { MentorIcon, SparklesIcon } from '../ui/icons.tsx';
import { cardName } from './card-name.ts';
import { GATHER_DELAY_S } from './reveal-timing.ts';
import { mentorAdvice, type Voice } from './scrum-mentor.ts';
import styles from './ScrumMentor.module.css';

interface ScrumMentorProps {
  readonly result: RoundResult;
  readonly players: readonly PlayerView[];
  readonly youId: string;
}

/** Nach dem Aufdecken: Was das Team jetzt tun sollte, damit es beim Scrum-Ablauf bleibt. */
export function ScrumMentor({ result, players, youId }: ScrumMentorProps) {
  const advice = mentorAdvice(result, players);
  if (!advice) return null;
  return (
    <motion.aside
      aria-label="Scrum-Mentor"
      className={styles.mentor}
      data-kind={advice.kind}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 220, damping: 22, delay: GATHER_DELAY_S + 0.9 }}
    >
      <p className={styles.eyebrow}>
        <MentorIcon size={16} />
        Scrum-Mentor
      </p>
      {advice.kind === 'discuss' && (
        <DiscussionGuide lowest={advice.lowest} highest={advice.highest} youId={youId} />
      )}
      {advice.kind === 'agreed' && (
        <>
          <h2 className={styles.title}>
            <SparklesIcon size={18} />
            Ihr seid euch einig
          </h2>
          <p className={styles.text}>
            Übernehmt die Schätzung und nehmt euch die nächste Story vor.
          </p>
        </>
      )}
      {advice.kind === 'clarify' && (
        <>
          <h2 className={styles.title}>Erst klären, dann schätzen</h2>
          <p className={styles.text}>
            Ein Fragezeichen oder die Kaffeetasse liegt auf dem Tisch: Sagt, was euch fehlt – eine
            Antwort zur Story oder eine kurze Pause. Danach schätzt ihr neu.
          </p>
        </>
      )}
    </motion.aside>
  );
}

interface DiscussionGuideProps {
  readonly lowest: Voice;
  readonly highest: Voice;
  readonly youId: string;
}

/** Der Ablauf bei Uneinigkeit: Die Ränder begründen, das Team fragt nach, dann wird neu geschätzt. */
function DiscussionGuide({ lowest, highest, youId }: DiscussionGuideProps) {
  return (
    <>
      <h2 className={styles.title}>Noch nicht einig – so geht’s weiter</h2>
      <ol className={styles.steps}>
        <SpeakerStep edge="lowest" voice={lowest} youId={youId} />
        <SpeakerStep edge="highest" voice={highest} youId={youId} />
        <li className={styles.step}>
          <span>Alle hören zu und fragen nach – ein, zwei Minuten pro Person.</span>
        </li>
        <li className={styles.step}>
          <span>
            <strong>Dann neu schätzen:</strong> Karte tauschen oder neue Runde starten, bis alle
            hinter einer Schätzung stehen.
          </span>
        </li>
      </ol>
    </>
  );
}

/** Was jeder Rand der Schätzung dem Team erklären soll. */
const EDGES = {
  lowest: { estimated: 'am niedrigsten', explains: 'was die Story klein macht' },
  highest: {
    estimated: 'am höchsten',
    explains: 'welcher Aufwand oder welches Risiko dahintersteckt',
  },
} as const;

const listFormat = new Intl.ListFormat('de', { style: 'long', type: 'conjunction' });

interface SpeakerStepProps {
  readonly edge: keyof typeof EDGES;
  readonly voice: Voice;
  readonly youId: string;
}

function SpeakerStep({ edge, voice, youId }: SpeakerStepProps) {
  const { estimated, explains } = EDGES[edge];
  const names = listFormat.format(voice.players.map((player) => player.name));
  const many = voice.players.length > 1;
  const yourTurn = voice.players.some((player) => player.id === youId);
  return (
    <li className={styles.step} data-your-turn={yourTurn}>
      <span>
        <span className={styles.speakers} aria-hidden="true">
          {voice.players.map((player) => (
            <Avatar key={player.id} name={player.name} avatar={player.avatar} size={24} />
          ))}
        </span>
        {names} {many ? 'haben' : 'hat'} {estimated} geschätzt (
        <strong className={styles.card}>{cardName(voice.card)}</strong>) und{' '}
        {many ? 'erklären' : 'erklärt'}, {explains}.
        {yourTurn && <span className={styles.yourTurn}>Du bist dran</span>}
      </span>
    </li>
  );
}
