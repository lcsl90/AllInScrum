import { AnimatePresence, motion } from 'motion/react';
import { LinkIcon } from '../ui/icons.tsx';
import { useClipboard } from '../ui/use-clipboard.ts';
import { inviteLink } from './invite-link.ts';
import styles from './JoinCodeBadge.module.css';

/** Der Join-Code zum Weiterschicken – per Klick in der Zwischenablage, wahlweise als Link. */
export function JoinCodeBadge({ joinCode, large = false }: { joinCode: string; large?: boolean }) {
  const { copy, copied } = useClipboard();

  return (
    <div className={styles.badge} data-large={large}>
      <button
        type="button"
        className={styles.code}
        aria-label={`Join-Code ${joinCode} kopieren`}
        title="Code kopieren"
        onClick={() => void copy(joinCode)}
      >
        {joinCode}
      </button>
      <button
        type="button"
        className={styles.link}
        aria-label="Einladungslink kopieren"
        title="Einladungslink kopieren"
        onClick={() => void copy(inviteLink(joinCode))}
      >
        <LinkIcon size={large ? 20 : 16} />
      </button>
      <AnimatePresence>
        {copied && (
          <motion.span
            className={styles.copied}
            role="status"
            initial={{ opacity: 0, y: 6, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6 }}
          >
            Kopiert!
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}
